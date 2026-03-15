"""
Finance Tools for AI Layer

Contains tools for managing cash records and expenses.
"""
from typing import Any, Dict
from datetime import datetime, timezone
from ai.tools import (
    register_tool,
    ToolParameter,
    ToolCategory,
    RiskLevel,
    ToolExecutionMode,
    ToolExecutionResult,
)
from core.database import SessionLocal


@register_tool(
    tool_id="create_cash_record",
    name="Create Cash Record (Expense)",
    description="Record an expense/masraf entry in the cash register",
    category=ToolCategory.ADMIN,
    risk_level=RiskLevel.MEDIUM,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="amount",
            type="number",
            description="Amount of the expense",
            required=True,
        ),
        ToolParameter(
            name="description",
            type="string",
            description="Description of the expense",
            required=True,
        ),
        ToolParameter(
            name="category",
            type="string",
            description="Expense category (e.g., Genel Gider, Kira, Fatura, Malzeme)",
            required=False,
        ),
        ToolParameter(
            name="date",
            type="string",
            description="Expense date in YYYY-MM-DD format",
            required=False,
        ),
    ],
    requires_permissions=["cash_records.create"],
)
def create_cash_record(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Create an expense record in the cash register."""
    amount = params["amount"]
    description = params["description"]
    tenant_id = params["tenant_id"]
    category = params.get("category", "Genel Gider")
    date_str = params.get("date")

    # Parse date
    record_date = datetime.now(timezone.utc)
    if date_str:
        try:
            record_date = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            pass

    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id="create_cash_record",
            success=True,
            mode=mode,
            simulated_changes={
                "action": "create",
                "entity": "CashRecord",
                "data": {
                    "amount": amount,
                    "description": description,
                    "category": category,
                    "date": record_date.isoformat(),
                    "type": "expense",
                }
            }
        )

    db = None
    try:
        db = SessionLocal()
        from core.database import gen_id
        from models.sales import PaymentRecord

        payment = PaymentRecord()
        payment.id = gen_id("cash")
        payment.tenant_id = tenant_id
        payment.amount = -abs(float(amount))  # Expenses are negative
        payment.payment_date = record_date
        payment.payment_method = "cash"
        payment.payment_type = "payment"
        payment.status = "paid"
        payment.notes = f"expense - {category}: {description}"

        db.add(payment)
        db.commit()

        return ToolExecutionResult(
            tool_id="create_cash_record",
            success=True,
            mode=mode,
            data={
                "id": payment.id,
                "amount": float(amount),
                "description": description,
                "category": category,
                "message": f"Masraf kaydedildi: {description} - {amount} TL"
            }
        )
    except Exception as e:
        if db:
            db.rollback()
        return ToolExecutionResult(
            tool_id="create_cash_record",
            success=False,
            mode=mode,
            error=str(e),
        )
    finally:
        if db:
            db.close()


@register_tool(
    tool_id="get_daily_cash_summary",
    name="Get Daily Cash Summary",
    description="Get cash register summary for today or a specific period",
    category=ToolCategory.READ,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="period",
            type="string",
            description="Period to query: today, week, month, year",
            required=False,
        ),
    ],
    requires_permissions=["cash_records.view"],
)
def get_daily_cash_summary(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Get cash summary for the requested period."""
    tenant_id = params["tenant_id"]
    period = params.get("period", "today")

    db = None
    try:
        db = SessionLocal()
        from sqlalchemy import func, and_
        from datetime import timedelta
        from models.sales import PaymentRecord

        now = datetime.now(timezone.utc)
        if period == "week":
            start = now - timedelta(days=7)
        elif period == "month":
            start = now.replace(day=1)
        elif period == "year":
            start = now.replace(month=1, day=1)
        else:
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        query = db.query(PaymentRecord).filter(
            PaymentRecord.tenant_id == tenant_id,
            PaymentRecord.payment_date >= start,
        )
        records = query.all()

        total_income = sum(r.amount for r in records if r.amount and r.amount > 0)
        total_expense = sum(abs(r.amount) for r in records if r.amount and r.amount < 0)
        net = total_income - total_expense

        return ToolExecutionResult(
            tool_id="get_daily_cash_summary",
            success=True,
            mode=mode,
            data={
                "period": period,
                "total_income": float(total_income),
                "total_expense": float(total_expense),
                "net": float(net),
                "record_count": len(records),
                "message": f"{period.capitalize()} özeti: Gelir {total_income:.2f} TL, Gider {total_expense:.2f} TL, Net {net:.2f} TL"
            }
        )
    except Exception as e:
        return ToolExecutionResult(
            tool_id="get_daily_cash_summary",
            success=False,
            mode=mode,
            error=str(e),
        )
    finally:
        if db:
            db.close()
