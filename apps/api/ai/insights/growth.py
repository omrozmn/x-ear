import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta, timezone
from sqlalchemy import func
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
        """Group patients by city to find geographic expansion opportunities."""
        raw_insights = []
        city_counts = self.db.query(
            Party.address_city, func.count(Party.id).label('count')
        ).filter(
            Party.tenant_id == tenant_id,
            Party.address_city.isnot(None), Party.address_city != "",
        ).group_by(Party.address_city).order_by(func.count(Party.id).desc()).limit(20).all()

        if len(city_counts) < 2:
            return []

        top_city_count = city_counts[0][1] if city_counts else 0
        for city, count in city_counts:
            # Cities with patients but much fewer than top city → expansion opportunity
            if 3 <= count <= top_city_count * 0.3:
                titles = {"tr": f"Büyüme Fırsatı: {city}", "en": f"Growth Opportunity: {city}"}
                summaries = {
                    "tr": f"{city}'de {count} hasta var ama potansiyel daha yüksek. Hedefli kampanya önerilir.",
                    "en": f"{count} patients in {city} but potential is higher. Targeted campaign recommended."
                }
                raw_insights.append({
                    "tenant_id": tenant_id, "type": self.insight_id, "category": "growth",
                    "entity_type": "location", "entity_id": city,
                    "priority": OpportunityPriority.LOW,
                    "confidence_score": 0.70, "impact_score": 0.50,
                    "title": self._get_localized_text(titles, locale),
                    "summary": self._get_localized_text(summaries, locale),
                    "recommended_capability": "create_campaign",
                    "recommended_action_label": self._get_localized_text({"tr": "Kampanya Oluştur", "en": "Create Campaign"}, locale)
                })
        return raw_insights

class ReferralPerformanceAnalyzer(BaseAnalyzer):
    """GR-004: Referral Source Performance."""
    insight_id = "GR-004"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        """Analyze referral sources to identify high-performing channels."""
        raw_insights = []
        # Group patients by referral_source (if field exists)
        try:
            referrals = self.db.query(
                Party.referral_source, func.count(Party.id).label('count')
            ).filter(
                Party.tenant_id == tenant_id,
                Party.referral_source.isnot(None), Party.referral_source != "",
            ).group_by(Party.referral_source).order_by(func.count(Party.id).desc()).limit(10).all()

            total = sum(r[1] for r in referrals) if referrals else 0
            for source, count in referrals:
                if count >= 5:
                    pct = (count / total * 100) if total else 0
                    titles = {"tr": f"Güçlü Referans Kaynağı: {source}", "en": f"Strong Referral: {source}"}
                    summaries = {
                        "tr": f"'{source}' kaynağından {count} hasta (%{pct:.0f}). Bu kanalı güçlendirmeye devam edin.",
                        "en": f"'{source}' referred {count} patients ({pct:.0f}%). Continue strengthening this channel."
                    }
                    raw_insights.append({
                        "tenant_id": tenant_id, "type": self.insight_id, "category": "growth",
                        "entity_type": "referral_source", "entity_id": source,
                        "priority": OpportunityPriority.LOW,
                        "confidence_score": 0.85, "impact_score": 0.45,
                        "title": self._get_localized_text(titles, locale),
                        "summary": self._get_localized_text(summaries, locale),
                        "recommended_capability": "create_campaign",
                        "recommended_action_label": self._get_localized_text({"tr": "Kampanya Oluştur", "en": "Create Campaign"}, locale)
                    })
        except Exception:
            pass  # referral_source field may not exist
        return raw_insights

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
    """GR-006: Competitor Activity Alert. Requires external data source — not implementable from CRM data alone."""
    insight_id = "GR-006"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        # This analyzer requires external market data (Google Trends, competitor pricing feeds)
        # which is not available in the CRM. Skipped intentionally.
        return []

class SocialProofOpportunityAnalyzer(BaseAnalyzer):
    """GR-007: Social Proof Opportunity — Find satisfied patients for testimonials."""
    insight_id = "GR-007"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        """Find patients with completed sales + positive outcomes for testimonial requests."""
        raw_insights = []
        # Patients with completed sales > 6 months ago (satisfied long-term users)
        six_months_ago = datetime.now(timezone.utc) - timedelta(days=180)
        happy_customers = self.db.query(
            Sale.party_id, func.count(Sale.id).label('sales')
        ).filter(
            Sale.tenant_id == tenant_id,
            Sale.status == 'completed',
            Sale.created_at < six_months_ago,
        ).group_by(Sale.party_id).having(func.count(Sale.id) >= 2).limit(10).all()

        for party_id, sales_count in happy_customers:
            party = self.db.query(Party).filter(Party.id == party_id).first()
            if not party:
                continue
            name = f"{party.first_name} {party.last_name}"
            titles = {"tr": f"Referans Adayı: {name}", "en": f"Testimonial Candidate: {name}"}
            summaries = {
                "tr": f"{name} uzun süreli müşteri ({sales_count} satış). Referans/yorum talebi gönderilebilir.",
                "en": f"{name} is a long-term customer ({sales_count} sales). Testimonial request recommended."
            }
            raw_insights.append({
                "tenant_id": tenant_id, "type": self.insight_id, "category": "growth",
                "entity_type": "party", "entity_id": party_id,
                "priority": OpportunityPriority.LOW,
                "confidence_score": 0.75, "impact_score": 0.40,
                "title": self._get_localized_text(titles, locale),
                "summary": self._get_localized_text(summaries, locale),
                "recommended_capability": "notification_send",
                "recommended_action_label": self._get_localized_text({"tr": "Yorum İste", "en": "Request Review"}, locale)
            })
        return raw_insights
