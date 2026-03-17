import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta, timezone
from sqlalchemy import func
from ai.insights.base import BaseAnalyzer
from core.models.party import Party
from core.models.sales import Sale, PaymentInstallment
from ai.models.opportunity import OpportunityPriority

logger = logging.getLogger(__name__)

class OverduePaymentAnalyzer(BaseAnalyzer):
    """FN-001: Overdue Invoice/Installment Reminder."""
    insight_id = "FN-001"
    schedule = "daily"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc)

        # 1. Find overdue installments
        overdue = self.db.query(PaymentInstallment).filter(
            PaymentInstallment.tenant_id == tenant_id,
            PaymentInstallment.status == 'pending',
            PaymentInstallment.due_date < now
        ).all()

        raw_insights = []
        for inst in overdue:
            # Get party from sale
            sale = self.db.query(Sale).filter(Sale.id == inst.sale_id).first() if hasattr(inst, 'sale_id') else None
            # Need to find sale via payment plan if sale_id not direct
            # (Assuming direct or easily traceable for now)
            
            party = self.db.query(Party).filter(Party.id == sale.party_id).first() if sale else None
            if not party:
                continue

            titles = {
                "tr": f"Gecikmiş Ödeme: {party.full_name}",
                "en": f"Overdue Payment: {party.full_name}"
            }
            summaries = {
                "tr": f"{inst.amount} TL tutarındaki taksit ödemesi gecikmiş durumda. (Vade: {inst.due_date.date()})",
                "en": f"Installment of {inst.amount} TL is overdue. (Due: {inst.due_date.date()})"
            }

            raw_insights.append({
                "tenant_id": tenant_id,
                "type": self.insight_id,
                "category": "financial",
                "entity_type": "installment",
                "entity_id": inst.id,
                "priority": OpportunityPriority.HIGH,
                "confidence_score": 1.0,
                "impact_score": 0.80,
                "title": self._get_localized_text(titles, locale),
                "summary": self._get_localized_text(summaries, locale),
                "recommended_capability": "send_payment_reminder",
                "recommended_action_label": self._get_localized_text({"tr": "Hatırlatıcı Gönder", "en": "Send Reminder"}, locale)
            })
        return raw_insights

class RevenueLeakageAnalyzer(BaseAnalyzer):
    """FN-004: Revenue Leakage Detection (Sale < Cost)."""
    insight_id = "FN-004"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        # 1. Find sales where final_amount < cost
        # (Assuming we can join with inventory to get cost)
        raw_insights = []
        
        leaking_sales = self.db.query(Sale).filter(
            Sale.tenant_id == tenant_id,
            Sale.status == 'completed'
        ).all()

        for sale in leaking_sales:
            # Simplified check: if final_amount seems suspiciously low
            # (In a real scenario, we'd join with InventoryItem.cost)
            if sale.final_amount and sale.list_price_total and sale.final_amount < (sale.list_price_total * 0.5):
                titles = {
                    "tr": f"Gelir Sızıntısı Riski: {sale.id}",
                    "en": f"Revenue Leakage Risk: {sale.id}"
                }
                summaries = {
                    "tr": f"Satış tutarı ({sale.final_amount}) liste fiyatının çok altında. Aşırı indirim veya hata olabilir.",
                    "en": f"Sale amount ({sale.final_amount}) is significantly below list price. Check for excessive discount or error."
                }

                raw_insights.append({
                    "tenant_id": tenant_id,
                    "type": self.insight_id,
                    "category": "financial",
                    "entity_type": "sale",
                    "entity_id": sale.id,
                    "priority": OpportunityPriority.MEDIUM,
                    "confidence_score": 0.80,
                    "impact_score": 0.70,
                    "title": self._get_localized_text(titles, locale),
                    "summary": self._get_localized_text(summaries, locale),
                    "recommended_capability": "review_sale",
                    "recommended_action_label": self._get_localized_text({"tr": "Satışı İncele", "en": "Review Sale"}, locale)
                })
        return raw_insights

class SGKRejectionRiskAnalyzer(BaseAnalyzer):
    """FN-002: SGK Claim Rejection Risk."""
    insight_id = "FN-002"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        """Identify SGK sales missing required fields that could cause claim rejection."""
        raw_insights = []
        # Sales with SGK coverage but missing TC number or hearing profile
        sgk_sales = self.db.query(Sale).join(Party, Sale.party_id == Party.id).filter(
            Sale.tenant_id == tenant_id,
            Sale.sgk_coverage_amount > 0,
            or_(Party.tc_number.is_(None), Party.tc_number == ""),
        ).all()

        for sale in sgk_sales:
            party = self.db.query(Party).filter(Party.id == sale.party_id).first()
            name = f"{party.first_name} {party.last_name}" if party else "Bilinmeyen"
            titles = {"tr": f"SGK Ret Riski: {name}", "en": f"SGK Rejection Risk: {name}"}
            summaries = {
                "tr": f"{name} için SGK'lı satış var ancak TC kimlik numarası eksik. Ret riski yüksek.",
                "en": f"SGK sale for {name} is missing TC number. High rejection risk."
            }
            raw_insights.append({
                "tenant_id": tenant_id, "type": self.insight_id, "category": "financial",
                "entity_type": "sale", "entity_id": sale.id,
                "priority": OpportunityPriority.HIGH,
                "confidence_score": 0.90, "impact_score": 0.80,
                "title": self._get_localized_text(titles, locale),
                "summary": self._get_localized_text(summaries, locale),
                "recommended_capability": "updateParty",
                "recommended_action_label": self._get_localized_text({"tr": "TC Ekle", "en": "Add TC"}, locale)
            })
        return raw_insights

class RefundPatternAnalyzer(BaseAnalyzer):
    """FN-008: Refund Request Analysis."""
    insight_id = "FN-008"
    schedule = "monthly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        """Detect branches with refund rate exceeding 15%."""
        raw_insights = []
        now = datetime.now(timezone.utc)
        month_ago = now - timedelta(days=30)

        branch_stats = self.db.query(
            Sale.branch_id,
            func.count(Sale.id).label('total'),
            func.sum(func.cast(Sale.status == 'refunded', Integer)).label('refunds')
        ).filter(
            Sale.tenant_id == tenant_id,
            Sale.created_at >= month_ago,
        ).group_by(Sale.branch_id).all()

        for branch_id, total, refunds in branch_stats:
            if total > 5 and refunds and (refunds / total) > 0.15:
                rate = (refunds / total) * 100
                titles = {"tr": f"Yüksek İade Oranı", "en": f"High Refund Rate"}
                summaries = {
                    "tr": f"Son 30 günde %{rate:.0f} iade oranı ({refunds}/{total}). Nedenleri araştırılmalı.",
                    "en": f"Refund rate {rate:.0f}% ({refunds}/{total}) in last 30 days. Investigation needed."
                }
                raw_insights.append({
                    "tenant_id": tenant_id, "type": self.insight_id, "category": "financial",
                    "entity_type": "branch", "entity_id": branch_id or "default",
                    "priority": OpportunityPriority.HIGH,
                    "confidence_score": 0.95, "impact_score": 0.75,
                    "title": self._get_localized_text(titles, locale),
                    "summary": self._get_localized_text(summaries, locale),
                    "recommended_capability": "generateReport",
                    "recommended_action_label": self._get_localized_text({"tr": "Rapor İncele", "en": "Review Report"}, locale)
                })
        return raw_insights

class DiscountThresholdAnalyzer(BaseAnalyzer):
    """FN-012: Manual Discount Threshold Overreached."""
    insight_id = "FN-012"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        # 1. Sales with discount > 25%
        raw_insights = []
        high_discounts = self.db.query(Sale).filter(
            Sale.tenant_id == tenant_id,
            Sale.final_amount < (Sale.list_price_total * 0.75)
        ).all()

        for sale in high_discounts:
            titles = {
                "tr": f"Yüksek İndirim Oranı: {sale.id}",
                "en": f"High Discount Alert: {sale.id}"
            }
            summaries = {
                "tr": "Bu satışta %25'den fazla indirim uygulanmış. Yetki ve kârlılık kontrolü önerilir.",
                "en": "Discount over 25% applied to this sale. Review authorization and profitability."
            }

            raw_insights.append({
                "tenant_id": tenant_id,
                "type": self.insight_id,
                "category": "financial",
                "entity_type": "sale",
                "entity_id": sale.id,
                "priority": OpportunityPriority.MEDIUM,
                "confidence_score": 1.0,
                "impact_score": 0.65,
                "title": self._get_localized_text(titles, locale),
                "summary": self._get_localized_text(summaries, locale),
                "recommended_capability": "review_sale",
                "recommended_action_label": self._get_localized_text({"tr": "İncele", "en": "Review"}, locale)
            })
        return raw_insights

class InstallmentSkipAnalyzer(BaseAnalyzer):
    """FN-013: Installment Skip Pattern."""
    insight_id = "FN-013"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        """Identify patients who skipped 2+ consecutive installment payments."""
        from models.payment import PaymentInstallment
        raw_insights = []
        now = datetime.now(timezone.utc)

        # Find pending installments past due date, grouped by party
        overdue = self.db.query(
            Sale.party_id,
            func.count(PaymentInstallment.id).label('skipped')
        ).join(Sale, PaymentInstallment.sale_id == Sale.id).filter(
            Sale.tenant_id == tenant_id,
            PaymentInstallment.status == 'pending',
            PaymentInstallment.due_date < now,
        ).group_by(Sale.party_id).having(func.count(PaymentInstallment.id) >= 2).all()

        for party_id, skipped in overdue:
            party = self.db.query(Party).filter(Party.id == party_id).first()
            name = f"{party.first_name} {party.last_name}" if party else party_id
            titles = {"tr": f"Taksit Atlama: {name}", "en": f"Installment Skip: {name}"}
            summaries = {
                "tr": f"{name} son {skipped} taksitini atladı. Ödeme planı gözden geçirilmeli.",
                "en": f"{name} skipped {skipped} installments. Payment plan review needed."
            }
            raw_insights.append({
                "tenant_id": tenant_id, "type": self.insight_id, "category": "financial",
                "entity_type": "party", "entity_id": party_id,
                "priority": OpportunityPriority.HIGH,
                "confidence_score": 0.95, "impact_score": 0.80,
                "title": self._get_localized_text(titles, locale),
                "summary": self._get_localized_text(summaries, locale),
                "recommended_capability": "notification_send",
                "recommended_action_label": self._get_localized_text({"tr": "Hatırlatma Gönder", "en": "Send Reminder"}, locale)
            })
        return raw_insights

class HighDebtAnalyzer(BaseAnalyzer):
    """FN-003: High Unpaid Balance Alert."""
    insight_id = "FN-003"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        # 1. Sum unpaid amounts per party
        debtors = self.db.query(
            Sale.party_id,
            func.sum(Sale.final_amount - Sale.paid_amount).label('total_debt')
        ).filter(
            Sale.tenant_id == tenant_id,
            Sale.status == 'completed'
        ).group_by(Sale.party_id).having(func.sum(Sale.final_amount - Sale.paid_amount) > 5000).all()

        raw_insights = []
        for party_id, total_debt in debtors:
            party = self.db.query(Party).filter(Party.id == party_id).first()
            if not party:
                continue

            titles = {
                "tr": f"Yüksek Borç Bakiyesi: {party.full_name}",
                "en": f"High Unpaid Balance: {party.full_name}"
            }
            summaries = {
                "tr": f"Hastanın toplam birikmiş borcu {total_debt} TL. Tahsilat araması önerilir.",
                "en": f"Patient has a total debt of {total_debt} TL. Collection call recommended."
            }

            raw_insights.append({
                "tenant_id": tenant_id,
                "type": self.insight_id,
                "category": "financial",
                "entity_type": "party",
                "entity_id": party_id,
                "priority": OpportunityPriority.HIGH,
                "confidence_score": 1.0,
                "impact_score": 0.85,
                "title": self._get_localized_text(titles, locale),
                "summary": self._get_localized_text(summaries, locale),
                "recommended_capability": "request_bulk_payment",
                "recommended_action_label": self._get_localized_text({"tr": "Tahsilat Araması Yap", "en": "Call for Payment"}, locale)
            })
        return raw_insights

class UpcomingPaymentAnalyzer(BaseAnalyzer):
    """FN-005: Upcoming Payment Milestone."""
    insight_id = "FN-005"
    schedule = "daily"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc)
        three_days_later = now + timedelta(days=3)

        upcoming = self.db.query(PaymentInstallment).filter(
            PaymentInstallment.tenant_id == tenant_id,
            PaymentInstallment.status == 'pending',
            PaymentInstallment.due_date >= now,
            PaymentInstallment.due_date <= three_days_later
        ).all()

        raw_insights = []
        for inst in upcoming:
            sale = self.db.query(Sale).filter(Sale.id == inst.sale_id).first() if hasattr(inst, 'sale_id') else None
            party = self.db.query(Party).filter(Party.id == sale.party_id).first() if sale else None
            if not party:
                continue

            titles = {
                "tr": f"Yaklaşan Ödeme: {party.full_name}",
                "en": f"Upcoming Payment: {party.full_name}"
            }
            summaries = {
                "tr": f"{inst.amount} TL tutarındaki taksit ödemesi yaklaşıyor. (Vade: {inst.due_date.date()})",
                "en": f"Installment payment of {inst.amount} TL is approaching. (Due: {inst.due_date.date()})"
            }

            raw_insights.append({
                "tenant_id": tenant_id,
                "type": self.insight_id,
                "category": "financial",
                "entity_type": "installment",
                "entity_id": inst.id,
                "priority": OpportunityPriority.MEDIUM,
                "confidence_score": 1.0,
                "impact_score": 0.50,
                "title": self._get_localized_text(titles, locale),
                "summary": self._get_localized_text(summaries, locale),
                "recommended_capability": "send_payment_reminder",
                "recommended_action_label": self._get_localized_text({"tr": "Hatırlat", "en": "Remind"}, locale)
            })
        return raw_insights

# Placeholder for FN-002, FN-006, FN-007...
