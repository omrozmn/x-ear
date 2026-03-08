import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta, timezone
from sqlalchemy import func, and_, or_, extract
from ai.insights.base import BaseAnalyzer
import sqlalchemy as sa
from core.models.appointment import Appointment
from core.models.party import Party
from core.models.inventory import InventoryItem
from core.models.sales import Sale
from schemas.enums import AppointmentStatus, PartyStatus, AppointmentType
from ai.models.opportunity import OpportunityPriority

logger = logging.getLogger(__name__)

class StaffWorkloadAnalyzer(BaseAnalyzer):
    """OP-001: Staff Workload Imbalance."""
    insight_id = "OP-001"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc)
        start_of_week = now - timedelta(days=7)

        # 1. Count appointments per clinician in last 7 days
        workload = self.db.query(
            Appointment.clinician_id,
            func.count(Appointment.id).label('app_count')
        ).filter(
            Appointment.tenant_id == tenant_id,
            Appointment.date >= start_of_week
        ).group_by(Appointment.clinician_id).all()

        if not workload:
            return []

        counts = [w.app_count for w in workload]
        avg_load = sum(counts) / len(counts)
        
        raw_insights = []
        for clinician_id, app_count in workload:
            # Logic: If clinician has > 1.5x average load
            if app_count > avg_load * 1.5:
                titles = {
"tr": f"Personel İş Yükü Dengesizliği: {clinician_id}",
                    "en": f"Staff Workload Imbalance: {clinician_id}"
                }
                summaries = {
                    "tr": f"Bu personelin haftalık randevu sayısı ({app_count}) ortalamanın ({int(avg_load)}) çok üzerinde. Tükenmişlik riski.",
                    "en": f"This staff member's weekly appointments ({app_count}) are significantly above average ({int(avg_load)}). Burnout risk."
                }

                raw_insights.append({
                    "tenant_id": tenant_id,
                    "type": self.insight_id,
                    "category": "operations",
                    "entity_type": "staff",
                    "entity_id": clinician_id,
                    "priority": OpportunityPriority.MEDIUM,
                    "confidence_score": 0.85,
                    "impact_score": 0.60,
                    "title": self._get_localized_text(titles, locale),
                    "summary": self._get_localized_text(summaries, locale),
                    "recommended_capability": "redistribute_workload",
                    "recommended_action_label": self._get_localized_text({"tr": "Yükü Yeniden Dağıt", "en": "Redistribute Load"}, locale)
                })
        return raw_insights

class PeakHourStrainAnalyzer(BaseAnalyzer):
    """OP-002: Peak Hour Resource Strain."""
    insight_id = "OP-002"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        # Logic: Find hours with highest density and high cancellation/delay
        # Simplified: Just find hours with overlapping appointments > capacity
        raw_insights = []
        # Implementation details... (simplified for now)
        return []

class CriticalStockAnalyzer(BaseAnalyzer):
    """OP-003: Critical Stock Shortage (formerly StockGuardian)."""
    insight_id = "OP-003"
    schedule = "daily"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        items = self.db.query(InventoryItem).filter(
            InventoryItem.tenant_id == tenant_id,
            InventoryItem.available_inventory <= InventoryItem.reorder_level
        ).all()

        raw_insights = []
        for item in items:
            titles = {
                "tr": f"Kritik Stok Uyarısı: {item.name}",
                "en": f"Critical Stock Alert: {item.name}"
            }
            summaries = {
                "tr": f"{item.name} stok seviyesi ({item.available_inventory}) kritik seviyenin altında. Sipariş verilmesi önerilir.",
                "en": f"Stock level for {item.name} ({item.available_inventory}) is below reorder level. Ordering recommended."
            }

            raw_insights.append({
                "tenant_id": tenant_id,
                "type": self.insight_id,
                "category": "operations",
                "entity_type": "inventory",
                "entity_id": item.id,
                "priority": OpportunityPriority.CRITICAL if item.available_inventory == 0 else OpportunityPriority.HIGH,
                "confidence_score": 1.0,
                "impact_score": 0.90,
                "title": self._get_localized_text(titles, locale),
                "summary": self._get_localized_text(summaries, locale),
                "recommended_capability": "create_purchase_order",
                "recommended_action_label": self._get_localized_text({"tr": "Sipariş Oluştur", "en": "Create Order"}, locale)
            })
        return raw_insights

class InventoryTurnoverAnalyzer(BaseAnalyzer):
    """OP-004: Low Inventory Turnover."""
    insight_id = "OP-004"
    schedule = "monthly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc)
        ninety_days_ago = now - timedelta(days=90)

        # 1. Find items in stock with no sales in 90 days
        items = self.db.query(InventoryItem).filter(
            InventoryItem.tenant_id == tenant_id,
            InventoryItem.available_inventory > 0,
            InventoryItem.created_at < ninety_days_ago
        ).outerjoin(Sale, InventoryItem.id == Sale.product_id).filter(
            or_(Sale.id.is_(None), Sale.sale_date < ninety_days_ago)
        ).all()

        raw_insights = []
        for item in items:
            titles = {
                "tr": f"Düşük Stok Devir Hızı: {item.name}",
                "en": f"Low Inventory Turnover: {item.name}"
            }
            summaries = {
                "tr": f"{item.name} son 90 gündür satılmadı. Stok maliyetini azaltmak için kampanya yapılabilir.",
                "en": f"{item.name} has not sold in 90 days. A promotion could reduce holding costs."
            }

            raw_insights.append({
                "tenant_id": tenant_id,
                "type": self.insight_id,
                "category": "operations",
                "entity_type": "inventory",
                "entity_id": item.id,
                "priority": OpportunityPriority.LOW,
                "confidence_score": 0.90,
                "impact_score": 0.40,
                "title": self._get_localized_text(titles, locale),
                "summary": self._get_localized_text(summaries, locale),
                "recommended_capability": "create_discount_campaign",
                "recommended_action_label": self._get_localized_text({"tr": "İndirim Tanımla", "en": "Set Discount"}, locale)
            })
        return raw_insights

class BranchPerformanceAnalyzer(BaseAnalyzer):
    """OP-005: Branch Performance Decline."""
    insight_id = "OP-005"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        # Logic: Compare current week revenue with last week
        # Implementation details... (simplified)
        return []

class CancellationRateAnalyzer(BaseAnalyzer):
    """OP-006: High Cancellation Rate."""
    insight_id = "OP-006"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc)
        start_of_week = now - timedelta(days=7)

        # 1. Calculate cancellation rate per branch
        stats = self.db.query(
            Appointment.branch_id,
            func.count(Appointment.id).label('total'),
            func.sum(sa.case((Appointment.status == AppointmentStatus.CANCELLED, 1), else_=0)).label('cancelled')
        ).filter(
            Appointment.tenant_id == tenant_id,
            Appointment.date >= start_of_week
        ).group_by(Appointment.branch_id).all()

        raw_insights = []
        for branch_id, total, cancelled in stats:
            if total > 0 and (cancelled / total) > 0.20:
                titles = {
                    "tr": f"Yüksek İptal Oranı: {branch_id}",
                    "en": f"High Cancellation Rate: {branch_id}"
                }
                summaries = {
                    "tr": f"Bu şubede iptal oranı %{int(cancelled/total*100)}'e ulaştı. Nedenleri araştırılmalıdır.",
                    "en": f"Cancellation rate at this branch reached {int(cancelled/total*100)}%. Investigation needed."
                }

                raw_insights.append({
                    "tenant_id": tenant_id,
                    "type": self.insight_id,
                    "category": "operations",
                    "entity_type": "branch",
                    "entity_id": branch_id,
                    "priority": OpportunityPriority.HIGH,
                    "confidence_score": 0.95,
                    "impact_score": 0.75,
                    "title": self._get_localized_text(titles, locale),
                    "summary": self._get_localized_text(summaries, locale),
                    "recommended_capability": "analyze_cancellations",
                    "recommended_action_label": self._get_localized_text({"tr": "İptalleri Analiz Et", "en": "Analyze Trends"}, locale)
                })
        return raw_insights
