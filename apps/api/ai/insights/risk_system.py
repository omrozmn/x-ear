import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta, timezone
from sqlalchemy import or_
from ai.insights.base import BaseAnalyzer
from core.models.party import Party
from core.models.invoice import Invoice
from ai.models.opportunity import OpportunityPriority

logger = logging.getLogger(__name__)

class DataQualityAnalyzer(BaseAnalyzer):
    """RS-002: Data Quality Issues."""
    insight_id = "RS-002"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        # 1. Find active parties with missing phone or TC
        incomplete = self.db.query(Party).filter(
            Party.tenant_id == tenant_id,
            Party.status == "active",
            or_(Party.phone.is_(None), Party.phone == "", Party.tc_number.is_(None))
        ).limit(20).all()

        raw_insights = []
        if incomplete:
            titles = {
                "tr": f"Veri Kalitesi Uyarısı: {len(incomplete)} Kayıt Eksik",
                "en": f"Data Quality Alert: {len(incomplete)} Incomplete Records"
            }
            summaries = {
                "tr": "Bazı aktif hasta kayıtlarında telefon veya TC kimlik numarası eksik. İletişim kopukluğu yaşanabilir.",
                "en": "Some active patient records are missing phone or TC numbers. Communication at risk."
            }

            raw_insights.append({
                "tenant_id": tenant_id,
                "type": self.insight_id,
                "category": "risk",
                "entity_type": "system",
                "entity_id": "data_quality_batch",
                "priority": OpportunityPriority.MEDIUM,
                "confidence_score": 1.0,
                "impact_score": 0.40,
                "title": self._get_localized_text(titles, locale),
                "summary": self._get_localized_text(summaries, locale),
                "recommended_capability": "cleanup_data",
                "recommended_action_label": self._get_localized_text({"tr": "Verileri Temizle", "en": "Cleanup Data"}, locale)
            })
        return raw_insights

class RegulatoryComplianceAnalyzer(BaseAnalyzer):
    """RS-003: Regulatory Compliance Gap (Invoice)."""
    insight_id = "RS-003"
    schedule = "daily"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc)
        forty_eight_hours_ago = now - timedelta(days=2)

        # 1. Active invoices not sent to GİB for > 48h
        pending_invoices = self.db.query(Invoice).filter(
            Invoice.tenant_id == tenant_id,
            Invoice.sent_to_gib.is_(False),
            Invoice.created_at < forty_eight_hours_ago
        ).all()

        raw_insights = []
        for inv in pending_invoices:
            titles = {
                "tr": f"Mevzuat Uyumluluk Riski: {inv.invoice_number}",
                "en": f"Compliance Risk: {inv.invoice_number}"
            }
            summaries = {
                "tr": "Fatura 48 saattir GİB'e gönderilmedi. Yasal ceza riski oluşabilir.",
                "en": "Invoice not sent to GİB for 48 hours. Potential legal penalty risk."
            }

            raw_insights.append({
                "tenant_id": tenant_id,
                "type": self.insight_id,
                "category": "risk",
                "entity_type": "invoice",
                "entity_id": inv.id,
                "priority": OpportunityPriority.CRITICAL,
                "confidence_score": 1.0,
                "impact_score": 0.95,
                "title": self._get_localized_text(titles, locale),
                "summary": self._get_localized_text(summaries, locale),
                "recommended_capability": "submit_to_gib",
                "recommended_action_label": self._get_localized_text({"tr": "GİB'e Gönder", "en": "Submit to GİB"}, locale)
            })
        return raw_insights

class StorageCapacityAnalyzer(BaseAnalyzer):
    """SY-003: Storage Capacity Warning."""
    insight_id = "SY-003"
    schedule = "daily"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        # This would typically check os level or cloud metrics
        # Placeholder for system integration
        return []

class SystemHealthAnalyzer(BaseAnalyzer):
    """SY-005: Integration Health Check (Placeholder)."""
    insight_id = "SY-005"
    schedule = "hourly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        return []
