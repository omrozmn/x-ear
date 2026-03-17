import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta, timezone
from sqlalchemy import func, or_
from ai.insights.base import BaseAnalyzer
import sqlalchemy as sa
from core.models.appointment import Appointment
from core.models.inventory import InventoryItem
from core.models.sales import Sale
from schemas.enums import AppointmentStatus
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
        """Find hours with highest appointment density and detect resource strain."""
        from sqlalchemy import extract, func
        now = datetime.now(timezone.utc)
        week_start = now - timedelta(days=7)

        # Count appointments per hour of day in last 7 days
        hourly = self.db.query(
            extract('hour', Appointment.date).label('hour'),
            func.count(Appointment.id).label('count')
        ).filter(
            Appointment.tenant_id == tenant_id,
            Appointment.date >= week_start,
            Appointment.status != "cancelled",
        ).group_by('hour').all()

        if not hourly:
            return []

        avg_count = sum(h[1] for h in hourly) / max(len(hourly), 1)
        raw_insights = []
        for hour, count in hourly:
            if count > avg_count * 1.8:  # 80% above average
                titles = {"tr": f"Yoğun Saat Uyarısı: {int(hour):02d}:00", "en": f"Peak Hour Alert: {int(hour):02d}:00"}
                summaries = {
                    "tr": f"Saat {int(hour):02d}:00'da haftalık {count} randevu var (ortalama: {avg_count:.0f}). Ek personel planlanabilir.",
                    "en": f"Hour {int(hour):02d}:00 has {count} weekly appointments (avg: {avg_count:.0f}). Consider additional staff."
                }
                raw_insights.append({
                    "tenant_id": tenant_id, "type": self.insight_id, "category": "operations",
                    "entity_type": "appointment", "entity_id": f"hour_{int(hour)}",
                    "priority": OpportunityPriority.MEDIUM,
                    "confidence_score": 0.80, "impact_score": 0.50,
                    "title": self._get_localized_text(titles, locale),
                    "summary": self._get_localized_text(summaries, locale),
                    "recommended_capability": "view_appointments",
                    "recommended_action_label": self._get_localized_text({"tr": "Randevuları Gör", "en": "View Appointments"}, locale)
                })
        return raw_insights

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
        """Compare current week revenue with previous week per branch."""
        from sqlalchemy import func
        now = datetime.now(timezone.utc)
        this_week_start = now - timedelta(days=7)
        last_week_start = now - timedelta(days=14)

        def week_revenue(start, end):
            return self.db.query(
                Sale.branch_id, func.sum(Sale.final_amount).label('revenue')
            ).filter(
                Sale.tenant_id == tenant_id,
                Sale.created_at >= start, Sale.created_at < end,
            ).group_by(Sale.branch_id).all()

        current = {r[0]: float(r[1] or 0) for r in week_revenue(this_week_start, now)}
        previous = {r[0]: float(r[1] or 0) for r in week_revenue(last_week_start, this_week_start)}

        raw_insights = []
        for branch_id, prev_rev in previous.items():
            curr_rev = current.get(branch_id, 0)
            if prev_rev > 0 and curr_rev < prev_rev * 0.7:  # 30%+ decline
                decline_pct = ((prev_rev - curr_rev) / prev_rev) * 100
                titles = {"tr": f"Şube Performans Düşüşü", "en": f"Branch Performance Decline"}
                summaries = {
                    "tr": f"Şube geliri %{decline_pct:.0f} azaldı (bu hafta: {curr_rev:,.0f}₺, geçen hafta: {prev_rev:,.0f}₺).",
                    "en": f"Branch revenue dropped {decline_pct:.0f}% (this week: {curr_rev:,.0f}, last week: {prev_rev:,.0f})."
                }
                raw_insights.append({
                    "tenant_id": tenant_id, "type": self.insight_id, "category": "operations",
                    "entity_type": "branch", "entity_id": branch_id or "default",
                    "priority": OpportunityPriority.HIGH,
                    "confidence_score": 0.85, "impact_score": 0.70,
                    "title": self._get_localized_text(titles, locale),
                    "summary": self._get_localized_text(summaries, locale),
                    "recommended_capability": "generateReport",
                    "recommended_action_label": self._get_localized_text({"tr": "Rapor Oluştur", "en": "Generate Report"}, locale)
                })
        return raw_insights

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


class LeadConversionAnalyzer(BaseAnalyzer):
    """OP-007: Lead Conversion Rate Drop."""
    insight_id = "OP-007"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        """Detect drops in lead-to-customer conversion rate."""
        from models.party import Party
        now = datetime.now(timezone.utc)
        this_month = now.replace(day=1)
        last_month = (this_month - timedelta(days=1)).replace(day=1)

        def conversion_rate(start, end):
            total = self.db.query(func.count(Party.id)).filter(Party.tenant_id == tenant_id, Party.created_at >= start, Party.created_at < end).scalar() or 0
            converted = self.db.query(func.count(Party.id)).filter(Party.tenant_id == tenant_id, Party.created_at >= start, Party.created_at < end, Party.status == 'customer').scalar() or 0
            return (converted / total * 100) if total > 0 else 0, total, converted

        curr_rate, curr_total, curr_conv = conversion_rate(this_month, now)
        prev_rate, _, _ = conversion_rate(last_month, this_month)

        raw_insights = []
        if prev_rate > 10 and curr_rate < prev_rate * 0.7:
            drop = prev_rate - curr_rate
            titles = {"tr": f"Lead Dönüşüm Düşüşü: %{drop:.0f}", "en": f"Lead Conversion Drop: {drop:.0f}%"}
            summaries = {"tr": f"Bu ayki dönüşüm oranı %{curr_rate:.0f} (geçen ay: %{prev_rate:.0f}). {curr_conv}/{curr_total} lead dönüştü.", "en": f"Conversion rate {curr_rate:.0f}% vs {prev_rate:.0f}% last month."}
            raw_insights.append({"tenant_id": tenant_id, "type": self.insight_id, "category": "operations", "entity_type": "metric", "entity_id": "lead_conversion", "priority": OpportunityPriority.HIGH, "confidence_score": 0.85, "impact_score": 0.70, "title": self._get_localized_text(titles, locale), "summary": self._get_localized_text(summaries, locale), "recommended_capability": "dynamic_query", "recommended_action_label": self._get_localized_text({"tr": "Analiz Et", "en": "Analyze"}, locale)})
        return raw_insights


class LeadStagnationAnalyzer(BaseAnalyzer):
    """OP-008: Lead Stagnation Detection."""
    insight_id = "OP-008"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        """Find leads with no activity in 14+ days."""
        from models.party import Party
        stale_date = datetime.now(timezone.utc) - timedelta(days=14)
        stale_leads = self.db.query(Party).filter(Party.tenant_id == tenant_id, Party.status == 'lead', Party.updated_at < stale_date).limit(20).all()
        raw_insights = []
        for lead in stale_leads:
            name = f"{lead.first_name} {lead.last_name}"
            titles = {"tr": f"Durgun Lead: {name}", "en": f"Stale Lead: {name}"}
            summaries = {"tr": f"{name} 14+ gündür aktivite göstermedi. Takip önerilir.", "en": f"{name} has been inactive for 14+ days."}
            raw_insights.append({"tenant_id": tenant_id, "type": self.insight_id, "category": "operations", "entity_type": "party", "entity_id": lead.id, "priority": OpportunityPriority.MEDIUM, "confidence_score": 0.80, "impact_score": 0.50, "title": self._get_localized_text(titles, locale), "summary": self._get_localized_text(summaries, locale), "recommended_capability": "notification_send", "recommended_action_label": self._get_localized_text({"tr": "Takip Mesajı Gönder", "en": "Send Follow-up"}, locale)})
        return raw_insights


class MissingDocumentAnalyzer(BaseAnalyzer):
    """OP-009: Missing Document Detection."""
    insight_id = "OP-009"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        """Find active patients missing required documents (TC, phone)."""
        from models.party import Party
        incomplete = self.db.query(Party).filter(Party.tenant_id == tenant_id, Party.status.in_(['customer', 'active']), or_(Party.tc_number.is_(None), Party.tc_number == "", Party.phone.is_(None), Party.phone == "")).limit(20).all()
        raw_insights = []
        for p in incomplete:
            name = f"{p.first_name} {p.last_name}"
            missing = []
            if not p.tc_number: missing.append("TC")
            if not p.phone: missing.append("telefon")
            titles = {"tr": f"Eksik Bilgi: {name}", "en": f"Missing Info: {name}"}
            summaries = {"tr": f"{name} için {', '.join(missing)} bilgisi eksik.", "en": f"{name} is missing: {', '.join(missing)}."}
            raw_insights.append({"tenant_id": tenant_id, "type": self.insight_id, "category": "operations", "entity_type": "party", "entity_id": p.id, "priority": OpportunityPriority.MEDIUM, "confidence_score": 1.0, "impact_score": 0.40, "title": self._get_localized_text(titles, locale), "summary": self._get_localized_text(summaries, locale), "recommended_capability": "updateParty", "recommended_action_label": self._get_localized_text({"tr": "Bilgi Güncelle", "en": "Update Info"}, locale)})
        return raw_insights


class StockInconsistencyAnalyzer(BaseAnalyzer):
    """OP-010: Stock Inconsistency Detection."""
    insight_id = "OP-010"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        """Detect inventory items where available > total (data inconsistency)."""
        items = self.db.query(InventoryItem).filter(InventoryItem.tenant_id == tenant_id, InventoryItem.available_inventory > InventoryItem.total_inventory).all()
        raw_insights = []
        for item in items:
            titles = {"tr": f"Stok Tutarsızlığı: {item.name}", "en": f"Stock Inconsistency: {item.name}"}
            summaries = {"tr": f"{item.name}: Kullanılabilir ({item.available_inventory}) > Toplam ({item.total_inventory}). Veri düzeltilmeli.", "en": f"{item.name}: Available ({item.available_inventory}) > Total ({item.total_inventory})."}
            raw_insights.append({"tenant_id": tenant_id, "type": self.insight_id, "category": "operations", "entity_type": "inventory", "entity_id": item.id, "priority": OpportunityPriority.HIGH, "confidence_score": 1.0, "impact_score": 0.60, "title": self._get_localized_text(titles, locale), "summary": self._get_localized_text(summaries, locale), "recommended_capability": "checkDeviceStock", "recommended_action_label": self._get_localized_text({"tr": "Stok Kontrol", "en": "Check Stock"}, locale)})
        return raw_insights


class ClinicianUtilizationAnalyzer(BaseAnalyzer):
    """OP-011: Clinician Utilization Rate."""
    insight_id = "OP-011"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        """Find underutilized clinicians (less than 30% of avg appointments)."""
        from core.models.user import User
        now = datetime.now(timezone.utc)
        week_ago = now - timedelta(days=7)
        clinician_counts = self.db.query(Appointment.clinician_id, func.count(Appointment.id).label('count')).filter(Appointment.tenant_id == tenant_id, Appointment.date >= week_ago).group_by(Appointment.clinician_id).all()
        if len(clinician_counts) < 2: return []
        avg = sum(c[1] for c in clinician_counts) / len(clinician_counts)
        raw_insights = []
        for cid, count in clinician_counts:
            if count < avg * 0.3 and cid:
                titles = {"tr": f"Düşük Klinisyen Kullanımı", "en": f"Low Clinician Utilization"}
                summaries = {"tr": f"Bu hafta sadece {count} randevu (ortalama: {avg:.0f}). Daha fazla randevu yönlendirilebilir.", "en": f"Only {count} appointments this week (avg: {avg:.0f})."}
                raw_insights.append({"tenant_id": tenant_id, "type": self.insight_id, "category": "operations", "entity_type": "user", "entity_id": cid, "priority": OpportunityPriority.LOW, "confidence_score": 0.75, "impact_score": 0.40, "title": self._get_localized_text(titles, locale), "summary": self._get_localized_text(summaries, locale), "recommended_capability": "dynamic_query", "recommended_action_label": self._get_localized_text({"tr": "Performans Raporu", "en": "Performance Report"}, locale)})
        return raw_insights


class SupplierLeadTimeAnalyzer(BaseAnalyzer):
    """OP-012: Supplier Lead Time Tracking."""
    insight_id = "OP-012"
    schedule = "monthly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        """Flag items with low stock and no recent replenishment (likely slow supplier)."""
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        low_no_restock = self.db.query(InventoryItem).filter(InventoryItem.tenant_id == tenant_id, InventoryItem.available_inventory <= InventoryItem.reorder_level, InventoryItem.updated_at < thirty_days_ago).all()
        raw_insights = []
        for item in low_no_restock:
            titles = {"tr": f"Tedarik Gecikmesi: {item.name}", "en": f"Supplier Delay: {item.name}"}
            summaries = {"tr": f"{item.name} düşük stokta ve 30+ gündür yenilenme yok. Tedarikçi ile iletişime geçin.", "en": f"{item.name} is low stock with no restock in 30+ days."}
            raw_insights.append({"tenant_id": tenant_id, "type": self.insight_id, "category": "operations", "entity_type": "inventory", "entity_id": item.id, "priority": OpportunityPriority.MEDIUM, "confidence_score": 0.80, "impact_score": 0.55, "title": self._get_localized_text(titles, locale), "summary": self._get_localized_text(summaries, locale), "recommended_capability": "notification_send", "recommended_action_label": self._get_localized_text({"tr": "Tedarikçiye Ulaş", "en": "Contact Supplier"}, locale)})
        return raw_insights
