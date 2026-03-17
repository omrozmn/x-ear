from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.sales import PaymentRecord, Sale
from models.user import User

_TR_MONTHS = [
    "", "Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran",
    "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik",
]


@dataclass
class PersonnelCompensationResult:
    employee_id: str
    employee_name: str
    linked_user_id: str | None
    linked_user: str | None
    period_label: str
    calculation_date: str
    model_type: str
    collection_rule: str
    target_amount: float | None
    rate_summary: str
    sales_total: float
    accrued_premium: float
    payroll_status: str


def _safe_decimal(value: Decimal | float | int | None) -> Decimal:
    if value is None:
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def _previous_month_range(now: datetime) -> tuple[datetime, datetime]:
    first_of_current_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_of_previous_month = first_of_current_month - timedelta(days=1)
    first_of_previous_month = last_of_previous_month.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    end_of_previous_month = last_of_previous_month.replace(hour=23, minute=59, second=59, microsecond=999999)
    return first_of_previous_month, end_of_previous_month


def resolve_period_window(settings: dict, now: datetime | None = None) -> tuple[datetime, datetime, str, str]:
    now = now or datetime.now(timezone.utc)
    compensation = settings.get("compensation", {})
    period_mode = compensation.get("periodMode") or "previous_month"
    calculation_offset_days = int(compensation.get("calculationOffsetDays") or 0)

    if period_mode == "current_month":
        period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        period_end = now
    else:
        period_start, period_end = _previous_month_range(now)

    calculation_date = (period_end.date() + timedelta(days=calculation_offset_days)).isoformat()
    period_label = f"{_TR_MONTHS[period_start.month]} {period_start.year}"
    return period_start, period_end, period_label, calculation_date


def _rate_summary(settings: dict) -> str:
    compensation = settings.get("compensation", {})
    model_type = compensation.get("modelType") or "fixed_rate"
    if compensation.get("targetEnabled") and model_type == "tiered":
        return "Hedef + Kademeli"
    if compensation.get("targetEnabled"):
        return "Hedef + Sabit"
    if model_type == "tiered":
        return "Kademeli"
    return "Sabit Yuzde"


def _eligible_sale_amount(
    sale: Sale,
    collected_amount: Decimal,
    collection_rule: str,
) -> Decimal:
    final_amount = _safe_decimal(sale.final_amount or sale.total_amount)

    if collection_rule == "down_payment_only":
        return min(collected_amount, final_amount)
    if collection_rule == "down_payment_full_credit":
        return final_amount if collected_amount > 0 else Decimal("0")
    return final_amount if collected_amount >= final_amount and final_amount > 0 else Decimal("0")


def _determine_rate(eligible_total: Decimal, compensation_settings: dict) -> Decimal:
    tiers = compensation_settings.get("tiers") or []
    model_type = compensation_settings.get("modelType") or "fixed_rate"
    base_rate = _safe_decimal(compensation_settings.get("baseRate"))

    if model_type != "tiered" or not tiers:
        return base_rate

    # Tiers must be ascending by threshold so the last matched tier wins.
    tiers = sorted(tiers, key=lambda t: _safe_decimal(t.get("threshold", 0)))
    applicable_rate = Decimal("0")
    for tier in tiers:
        threshold = _safe_decimal(tier.get("threshold"))
        rate = _safe_decimal(tier.get("rate"))
        if eligible_total >= threshold:
            applicable_rate = rate
    return applicable_rate


def calculate_compensation_rows(
    db: Session,
    tenant_id: str,
    users: Iterable[User],
    personnel_settings: dict,
) -> list[PersonnelCompensationResult]:
    compensation_settings = personnel_settings.get("compensation", {})
    period_start, period_end, period_label, calculation_date = resolve_period_window(personnel_settings)
    calculation_cutoff = datetime.fromisoformat(calculation_date).replace(tzinfo=timezone.utc, hour=23, minute=59, second=59, microsecond=999999)
    collection_rule = compensation_settings.get("collectionRule") or "full_collection_only"
    target_enabled = bool(compensation_settings.get("targetEnabled"))
    target_amount = _safe_decimal(compensation_settings.get("targetAmount"))

    user_ids = [user.id for user in users if user.id]
    if not user_ids:
        return []

    sales = (
        db.query(Sale)
        .filter(Sale.tenant_id == tenant_id)
        .filter(Sale.sales_owner_user_id.in_(user_ids))
        .filter(Sale.sale_date >= period_start)
        .filter(Sale.sale_date <= period_end)
        .all()
    )

    sale_ids = [s.id for s in sales]
    if sale_ids:
        payment_rows = (
            db.query(
                PaymentRecord.sale_id,
                func.coalesce(func.sum(PaymentRecord.amount), 0).label("collected_amount"),
            )
            .filter(PaymentRecord.tenant_id == tenant_id)
            .filter(PaymentRecord.status == "paid")
            .filter(PaymentRecord.sale_id.in_(sale_ids))
            .filter(PaymentRecord.payment_date <= calculation_cutoff)
            .group_by(PaymentRecord.sale_id)
            .all()
        )
        collected_by_sale = {sale_id: _safe_decimal(amount) for sale_id, amount in payment_rows}
    else:
        collected_by_sale = {}

    sales_by_owner: dict[str, list[Sale]] = {}
    for sale in sales:
        if not sale.sales_owner_user_id:
            continue
        sales_by_owner.setdefault(sale.sales_owner_user_id, []).append(sale)

    results: list[PersonnelCompensationResult] = []
    for user in users:
        employee_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or user.username or user.email
        user_sales = sales_by_owner.get(user.id, [])
        eligible_total = Decimal("0")
        for sale in user_sales:
            # Only use payment records collected in this period.
            # Do NOT fall back to sale.paid_amount — it is a cumulative
            # lifetime total and would cause double-counting across periods.
            collected_amount = collected_by_sale.get(sale.id, Decimal("0"))
            eligible_total += _eligible_sale_amount(sale, collected_amount, collection_rule)

        meets_target = (not target_enabled) or (eligible_total >= target_amount and target_amount > 0)
        effective_rate = _determine_rate(eligible_total, compensation_settings) if meets_target else Decimal("0")
        accrued_premium = (eligible_total * effective_rate / Decimal("100")).quantize(Decimal("0.01"))
        payroll_status = "Aktarima Hazir" if accrued_premium > 0 else ("Hedef Bekleniyor" if target_enabled else "Taslak")

        results.append(
            PersonnelCompensationResult(
                employee_id=user.id,
                employee_name=employee_name,
                linked_user_id=user.id,
                linked_user=user.username,
                period_label=period_label,
                calculation_date=calculation_date,
                model_type=compensation_settings.get("modelType") or "fixed_rate",
                collection_rule=collection_rule,
                target_amount=float(target_amount) if target_enabled and target_amount > 0 else None,
                rate_summary=_rate_summary(personnel_settings),
                sales_total=float(eligible_total),
                accrued_premium=float(accrued_premium),
                payroll_status=payroll_status,
            )
        )

    return results
