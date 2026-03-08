import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta, timezone
from sqlalchemy import func, and_, or_
from ai.insights.base import BaseAnalyzer
from core.models.party import Party
from core.models.sales import Sale
from core.models.campaign import Campaign, SmsLog
from ai.models.opportunity import OpportunityPriority

logger = logging.getLogger(__name__)

class LeadEngagementAnalyzer(BaseAnalyzer):
    """GR-001: High Engagement Lead Opportunity."""
    insight_id = "GR-001"
    schedule = "daily"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc)
        fourteen_days_ago = now - timedelta(days=14)

        # 1. Find leads with opened/clicked SMS in last 14 days
        # This requires joining SmsLog with Party
        hot_leads = self.db.query(Party).join(SmsLog).filter(
            Party.tenant_id == tenant_id,
            Party.segment == "lead",
            SmsLog.clicked_at >= fourteen_days_ago
        ).all()

        raw_insights = []
        for lead in hot_leads:
            titles = {
                "tr": f"Sıcak Kurşun Fırsatı: {lead.full_name}",
                "en": f"Hot Lead Opportunity: {lead.full_name}"
            }
            summaries = {
                "tr": "Aday müşteri son gönderilen kampanyadaki linke tıkladı. Satış için hazır olabilir.",
                "en": "Lead clicked a link in the recent campaign. High engagement detected."
            }

            raw_insights.append({
                "tenant_id": tenant_id,
                "type": self.insight_id,
                "category": "growth",
                "entity_type": "party",
                "entity_id": lead.id,
                "priority": OpportunityPriority.HIGH,
                "confidence_score": 0.85,
                "impact_score": 0.80,
                "title": self._get_localized_text(titles, locale),
                "summary": self._get_localized_text(summaries, locale),
                "recommended_capability": "schedule_appointment",
                "recommended_action_label": self._get_localized_text({"tr": "Randevu Teklif Et", "en": "Offer Appointment"}, locale)
            })
        return raw_insights

class CampaignRoIAnalyzer(BaseAnalyzer):
    """GR-002: Campaign ROI Analysis."""
    insight_id = "GR-002"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        # 1. Find campaigns sent in last 30 days
        now = datetime.now(timezone.utc)
        month_ago = now - timedelta(days=30)
        
        campaigns = self.db.query(Campaign).filter(
            Campaign.tenant_id == tenant_id,
            Campaign.sent_at >= month_ago
        ).all()

        raw_insights = []
        for camp in campaigns:
            # ROI calculation... (simplified)
            if camp.successful_sends > 0:
                titles = {
                    "tr": f"Kampanya Performans Özeti: {camp.name}",
                    "en": f"Campaign Performance: {camp.name}"
                }
                summaries = {
                    "tr": f"Kampanya başarı oranı %{int(camp.successful_sends/camp.total_recipients*100) if camp.total_recipients else 0}.",
                    "en": f"Success rate: {int(camp.successful_sends/camp.total_recipients*100) if camp.total_recipients else 0}%."
                }
                raw_insights.append({
                    "tenant_id": tenant_id,
                    "type": self.insight_id,
                    "category": "growth",
                    "entity_type": "campaign",
                    "entity_id": camp.id,
                    # ...
                    "priority": OpportunityPriority.LOW,
                    "confidence_score": 1.0,
                    "impact_score": 0.40,
                    "title": self._get_localized_text(titles, locale),
                    "summary": self._get_localized_text(summaries, locale),
                    "recommended_capability": "view_campaign_report",
                    "recommended_action_label": self._get_localized_text({"tr": "Raporu Gör", "en": "View Report"}, locale)
                })
        return raw_insights

class GeographicDensityAnalyzer(BaseAnalyzer):
    """GR-003: Geographic Expansion Opportunity."""
    insight_id = "GR-003"
    schedule = "monthly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        # Group patients by address components (simplified)
        return []

class ReferralPerformanceAnalyzer(BaseAnalyzer):
    """GR-004: Referral Source Performance."""
    insight_id = "GR-004"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        return []

class LTVSegmentationAnalyzer(BaseAnalyzer):
    """GR-005: Customer LTV Segmentation."""
    insight_id = "GR-005"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        # 1. Calculate LTV per customer
        customers = self.db.query(
            Sale.party_id,
            func.sum(Sale.final_amount).label('ltv')
        ).filter(Sale.tenant_id == tenant_id).group_by(Sale.party_id).all()

        raw_insights = []
        for party_id, ltv in customers:
            if ltv > 50000: # VIP Threshold
                party = self.db.query(Party).filter(Party.id == party_id).first()
                if not party:
                    continue
                # if not already VIP...
                titles = {
"tr": f"Yeni VIP Adayı: {party.full_name}",
                    "en": f"New VIP Candidate: {party.full_name}"
                }
                summaries = {
                    "tr": f"Hastanın toplam harcaması ({ltv} TL) VIP segmentine yaklaşıyor. Özel hizmet teklif edilebilir.",
                    "en": f"Patient's lifetime value ({ltv} TL) is reaching VIP tier. Special services can be offered."
                }
                raw_insights.append({
                    "tenant_id": tenant_id,
                    "type": self.insight_id,
                    "category": "growth",
                    "entity_type": "party",
                    "entity_id": party_id,
                    "priority": OpportunityPriority.MEDIUM,
                    "confidence_score": 0.95,
                    "impact_score": 0.60,
                    "title": self._get_localized_text(titles, locale),
                    "summary": self._get_localized_text(summaries, locale),
                    "recommended_capability": "assign_to_vip_program",
                    "recommended_action_label": self._get_localized_text({"tr": "VIP Yap", "en": "Make VIP"}, locale)
                })
        return raw_insights

class CompetitorActivityAnalyzer(BaseAnalyzer):
    """GR-006: Competitor Activity Alert."""
    insight_id = "GR-006"
    schedule = "weekly"
    
    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        return []

class SocialProofOpportunityAnalyzer(BaseAnalyzer):
    """GR-007: Social Proof Opportunity."""
    insight_id = "GR-007"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        return []
