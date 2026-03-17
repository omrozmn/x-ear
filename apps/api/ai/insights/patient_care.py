import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta, timezone
from sqlalchemy import func, or_, extract
from ai.insights.base import BaseAnalyzer
from core.models.appointment import Appointment
from core.models.party import Party
from core.models.device import Device
from core.models.medical import HearingTest, PatientNote
from core.models.hearing_profile import HearingProfile
from core.models.sales import Sale, DeviceAssignment
from schemas.enums import AppointmentStatus, PartyStatus
from ai.models.opportunity import OpportunityPriority

logger = logging.getLogger(__name__)

class NoShowRiskAnalyzer(BaseAnalyzer):
    """PC-001: Appointment No-Show Risk Prediction."""
    insight_id = "PC-001"
    schedule = "hourly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc)
        window_start = now + timedelta(hours=24)
        window_end = now + timedelta(hours=48)

        # 1. Find upcoming unconfirmed appointments
        upcoming = self.db.query(Appointment).filter(
            Appointment.tenant_id == tenant_id,
            Appointment.date >= window_start,
            Appointment.date <= window_end,
            Appointment.status == AppointmentStatus.SCHEDULED
        ).all()

        raw_insights = []
        for apt in upcoming:
            # 2. Check history (last 6 months)
            six_months_ago = now - timedelta(days=180)
            no_shows = self.db.query(func.count(Appointment.id)).filter(
                Appointment.party_id == apt.party_id,
                Appointment.status == AppointmentStatus.NO_SHOW,
                Appointment.date >= six_months_ago
            ).scalar()

            # 3. Check party details
            party = self.db.query(Party).filter(Party.id == apt.party_id).first()
            if not party:
                continue

            # Logic: >2 no-shows OR (lead AND priority < 30)
            is_high_risk = no_shows > 2 or (party.segment == "lead" and party.priority_score < 30)

            if is_high_risk:
                confidence = 0.85 if no_shows > 2 else 0.75
                impact = 0.70
                
                titles = {
"tr": f"Yüksek Gelmeme Riski: {party.full_name}",
                    "en": f"High No-Show Risk: {party.full_name}"
                }
                summaries = {
                    "tr": f"Hastanın son 6 ayda {no_shows} gelmeme geçmişi var. Randevu henüz onaylanmadı.",
                    "en": f"Patient has {no_shows} no-shows in last 6 months. Appointment not confirmed yet."
                }

                raw_insights.append({
                    "tenant_id": tenant_id,
                    "type": self.insight_id,
                    "category": "patient_care",
                    "entity_type": "appointment",
                    "entity_id": apt.id,
                    "priority": OpportunityPriority.HIGH,
                    "confidence_score": confidence,
                    "impact_score": impact,
                    "title": self._get_localized_text(titles, locale),
                    "summary": self._get_localized_text(summaries, locale),
                    "why_now": self._get_localized_text({"tr": "Randevuya 24-48 saat kaldı ve risk faktörleri yüksek.", "en": "24-48h until appointment with high risk factors."}, locale),
                    "recommended_capability": "send_sms_reminder",
                    "recommended_action_label": self._get_localized_text({"tr": "SMS Hatırlatıcı Gönder", "en": "Send SMS Reminder"}, locale)
                })

        return raw_insights


class WarrantyExpiringAnalyzer(BaseAnalyzer):
    """PC-002: Device Warranty Expiring Soon."""
    insight_id = "PC-002"
    schedule = "daily"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc)
        thirty_days_later = now + timedelta(days=30)

        # 1. Find devices with warranty expiring in next 30 days
        expiring = self.db.query(Device).filter(
            Device.tenant_id == tenant_id,
            Device.warranty_end_date >= now,
            Device.warranty_end_date <= thirty_days_later,
            Device.status == "ASSIGNED"
        ).all()

        raw_insights = []
        for dev in expiring:
            party = self.db.query(Party).filter(Party.id == dev.party_id).first()
            if not party:
                continue

            titles = {
                "tr": f"Garanti Bitiş Uyarısı: {party.full_name}",
                "en": f"Warranty Expiry Alert: {party.full_name}"
            }
            summaries = {
                "tr": f"{dev.brand} {dev.model} cihazının garantisi {dev.warranty_end_date.date()} tarihinde bitiyor.",
                "en": f"Warranty for {dev.brand} {dev.model} expires on {dev.warranty_end_date.date()}."
            }

            raw_insights.append({
                "tenant_id": tenant_id,
                "type": self.insight_id,
                "category": "patient_care",
                "entity_type": "device",
                "entity_id": dev.id,
                "priority": OpportunityPriority.MEDIUM,
                "confidence_score": 1.0, # Deterministic
                "impact_score": 0.60,
                "title": self._get_localized_text(titles, locale),
                "summary": self._get_localized_text(summaries, locale),
                "recommended_capability": "offer_extended_warranty",
                "recommended_action_label": self._get_localized_text({"tr": "Ek Garanti Teklif Et", "en": "Offer Extended Warranty"}, locale)
            })
        return raw_insights

class TrialPeriodEndingAnalyzer(BaseAnalyzer):
    """PC-003: Trial Period Ending Without Decision."""
    insight_id = "PC-003"
    schedule = "daily"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc)
        three_days_later = now + timedelta(days=3)

        # 1. Find devices in trial ending in next 3 days
        trials = self.db.query(Device).filter(
            Device.tenant_id == tenant_id,
            Device.trial_end_date >= now,
            Device.trial_end_date <= three_days_later,
            Device.status == "TRIAL"
        ).all()

        raw_insights = []
        for dev in trials:
            party = self.db.query(Party).filter(Party.id == dev.party_id).first()
            if not party:
                continue

            titles = {
                "tr": f"Deneme Süresi Bitiyor: {party.full_name}",
                "en": f"Trial Period Ending: {party.full_name}"
            }
            summaries = {
                "tr": f"Cihaz deneme süresi 3 gün içinde doluyor ({dev.trial_end_date.date()}). Satış kapatma fırsatı.",
                "en": f"Trial period expires in 3 days ({dev.trial_end_date.date()}). Sales closing opportunity."
            }

            raw_insights.append({
                "tenant_id": tenant_id,
                "type": self.insight_id,
                "category": "patient_care",
                "entity_type": "device",
                "entity_id": dev.id,
                "priority": OpportunityPriority.HIGH,
                "confidence_score": 0.95,
                "impact_score": 0.90,
                "title": self._get_localized_text(titles, locale),
                "summary": self._get_localized_text(summaries, locale),
                "recommended_capability": "convert_trial_to_sale",
                "recommended_action_label": self._get_localized_text({"tr": "Satışa Dönüştür", "en": "Convert to Sale"}, locale)
            })
        return raw_insights

class HearingTestOverdueAnalyzer(BaseAnalyzer):
    """PC-004: Hearing Test Overdue."""
    insight_id = "PC-004"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc)
        one_year_ago = now - timedelta(days=365)

        # 1. Find active patients with no hearing test in last year
        # Subquery for last test date
        last_test_sub = self.db.query(
            HearingTest.party_id,
            func.max(HearingTest.test_date).label('max_date')
        ).group_by(HearingTest.party_id).subquery()

        overdue_patients = self.db.query(Party).join(
            last_test_sub, Party.id == last_test_sub.c.party_id, isouter=True
        ).filter(
            Party.tenant_id == tenant_id,
            Party.status == PartyStatus.ACTIVE,
            or_(last_test_sub.c.max_date < one_year_ago, last_test_sub.c.max_date.is_(None))
        ).all()

        raw_insights = []
        for party in overdue_patients:
            # Check age > 60
            if party.birth_date:
                age = (now - party.birth_date.replace(tzinfo=timezone.utc)).days / 365
                if age < 60:
                    continue
            else:
                continue # Skip if age unknown for this rule

            titles = {
                "tr": f"İşitme Testi Gecikti: {party.full_name}",
                "en": f"Hearing Test Overdue: {party.full_name}"
            }
            summaries = {
                "tr": "Son işitme testinin üzerinden 1 yıldan fazla zaman geçti. 60 yaş üstü hastalar için yıllık kontrol önerilir.",
                "en": "Last hearing test was over a year ago. Annual checks recommended for patients over 60."
            }

            raw_insights.append({
                "tenant_id": tenant_id,
                "type": self.insight_id,
                "category": "patient_care",
                "entity_type": "party",
                "entity_id": party.id,
                "priority": OpportunityPriority.LOW,
                "confidence_score": 0.90,
                "impact_score": 0.50,
                "title": self._get_localized_text(titles, locale),
                "summary": self._get_localized_text(summaries, locale),
                "recommended_capability": "schedule_appointment",
                "recommended_action_label": self._get_localized_text({"tr": "Test Randevusu Oluştur", "en": "Schedule Test"}, locale)
            })
        return raw_insights

class PatientDisengagementAnalyzer(BaseAnalyzer):
    """PC-005: Patient Disengagement Risk."""
    insight_id = "PC-005"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc)
        six_months_ago = now - timedelta(days=180)

        # 1. Find customers with no activity for 6 months
        # Simplified: Check last appointment date
        last_apt_sub = self.db.query(
            Appointment.party_id,
            func.max(Appointment.date).label('max_date')
        ).group_by(Appointment.party_id).subquery()

        disengaged = self.db.query(Party).join(
            last_apt_sub, Party.id == last_apt_sub.c.party_id
        ).filter(
            Party.tenant_id == tenant_id,
            Party.status == PartyStatus.CUSTOMER,
            last_apt_sub.c.max_date < six_months_ago
        ).all()

        raw_insights = []
        for party in disengaged:
            titles = {
                "tr": f"Hasta Bağlılık Riski: {party.full_name}",
                "en": f"Patient Disengagement Risk: {party.full_name}"
            }
            summaries = {
                "tr": "6 aydır herhangi bir etkileşim veya randevu bulunmuyor. Geri kazanım araması önerilir.",
                "en": "No interaction or appointment for 6 months. Retention call recommended."
            }

            raw_insights.append({
                "tenant_id": tenant_id,
                "type": self.insight_id,
                "category": "patient_care",
                "entity_type": "party",
                "entity_id": party.id,
                "priority": OpportunityPriority.MEDIUM,
                "confidence_score": 0.80,
                "impact_score": 0.70,
                "title": self._get_localized_text(titles, locale),
                "summary": self._get_localized_text(summaries, locale),
                "recommended_capability": "call_patient",
                "recommended_action_label": self._get_localized_text({"tr": "Hastayı Ara", "en": "Call Patient"}, locale)
            })
        return raw_insights

class SGKEligibilityExpiringAnalyzer(BaseAnalyzer):
    """PC-006: SGK Eligibility Expiring."""
    insight_id = "PC-006"
    schedule = "daily"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc)
        thirty_days_later = now + timedelta(days=30)

        # 1. Find patients with SGK eligibility expiring soon
        # Checking both Party.sgk_info and HearingProfile.sgk_info
        raw_insights = []
        
        # Check HearingProfile
        expiring_profiles = self.db.query(HearingProfile).filter(
            HearingProfile.tenant_id == tenant_id
        ).all()

        for prof in expiring_profiles:
            sgk = prof.sgk_info_json
            if not sgk or 'eligibilityDate' not in sgk:
                continue
            
            try:
                elig_date = datetime.fromisoformat(sgk['eligibilityDate']).replace(tzinfo=timezone.utc)
            except Exception:
                continue

            if now <= elig_date <= thirty_days_later:
                party = self.db.query(Party).filter(Party.id == prof.party_id).first()
                if not party:
                    continue

                titles = {
                    "tr": f"SGK Hak Ediş Bitiyor: {party.full_name}",
                    "en": f"SGK Eligibility Expiring: {party.full_name}"
                }
                summaries = {
                    "tr": f"Hastanın SGK cihaz hak ediş süresi {elig_date.date()} tarihinde doluyor. Yenileme için bilgilendirme yapılabilir.",
                    "en": f"Patient's SGK device eligibility expires on {elig_date.date()}. Renewal notification recommended."
                }

                raw_insights.append({
                    "tenant_id": tenant_id,
                    "type": self.insight_id,
                    "category": "patient_care",
                    "entity_type": "party",
                    "entity_id": party.id,
                    "priority": OpportunityPriority.MEDIUM,
                    "confidence_score": 1.0,
                    "impact_score": 0.65,
                    "title": self._get_localized_text(titles, locale),
                    "summary": self._get_localized_text(summaries, locale),
                    "recommended_capability": "send_notification",
                    "recommended_action_label": self._get_localized_text({"tr": "Bilgilendir", "en": "Notify Patient"}, locale)
                })
        return raw_insights

class BatteryReplacementAnalyzer(BaseAnalyzer):
    """PC-007: Battery Replacement Due."""
    insight_id = "PC-007"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc)
        six_months_ago = now - timedelta(days=180)

        # 1. Find patients who haven't bought batteries in 6 months
        # Simplified: Check last Sale for anything with 'pil' or 'battery' in name/notes
        # Or better: if we have a category 'battery' in Inventory (skipping complex inventory joins for now)
        raw_insights = []
        
        # We'll use a simplified check on Sales for this pilot iteration
        last_battery_sales = self.db.query(
            Sale.party_id,
            func.max(Sale.sale_date).label('last_date')
        ).filter(
            Sale.tenant_id == tenant_id,
            or_(Sale.notes.ilike('%pil%'), Sale.notes.ilike('%battery%')) # Fallback check
        ).group_by(Sale.party_id).all()

        for party_id, last_date in last_battery_sales:
            if last_date.replace(tzinfo=timezone.utc) < six_months_ago:
                party = self.db.query(Party).filter(Party.id == party_id).first()
                if not party:
                    continue

                titles = {
                    "tr": f"Pil Değişim Zamanı: {party.full_name}",
                    "en": f"Battery Replacement Due: {party.full_name}"
                }
                summaries = {
                    "tr": "Hastanın son pil alımının üzerinden 6 aydan fazla zaman geçti. Hatırlatma yapılabilir.",
                    "en": "Over 6 months since patient's last battery purchase. Reminder recommended."
                }

                raw_insights.append({
                    "tenant_id": tenant_id,
                    "type": self.insight_id,
                    "category": "patient_care",
                    "entity_type": "party",
                    "entity_id": party.id,
                    "priority": OpportunityPriority.LOW,
                    "confidence_score": 0.70,
                    "impact_score": 0.40,
                    "title": self._get_localized_text(titles, locale),
                    "summary": self._get_localized_text(summaries, locale),
                    "recommended_capability": "send_sms_campaign",
                    "recommended_action_label": self._get_localized_text({"tr": "Pil Kampanyası Gönder", "en": "Send Battery Promo"}, locale)
                })
        return raw_insights

class DeviceMaintenanceAnalyzer(BaseAnalyzer):
    """PC-008: Device Maintenance Overdue."""
    insight_id = "PC-008"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc)
        six_months_ago = now - timedelta(days=180)

        # 1. Find patients with active devices and no maintenance in 6 months
        # Check PatientNote or Appointment status/type
        raw_insights = []
        
        assigned_devices = self.db.query(Device).filter(
            Device.tenant_id == tenant_id,
            Device.status == "ASSIGNED"
        ).all()

        for dev in assigned_devices:
            # Check last maintenance note or appointment
            last_maint = self.db.query(func.max(PatientNote.created_at)).filter(
                PatientNote.party_id == dev.party_id,
                PatientNote.category == 'maintenance' # Registry rule
            ).scalar()

            if not last_maint or last_maint.replace(tzinfo=timezone.utc) < six_months_ago:
                party = self.db.query(Party).filter(Party.id == dev.party_id).first()
                if not party:
                    continue

                titles = {
                    "tr": f"Cihaz Bakımı Gecikti: {party.full_name}",
                    "en": f"Device Maintenance Overdue: {party.full_name}"
                }
                summaries = {
                    "tr": f"{dev.brand} {dev.model} cihazı için rutin bakım zamanı geçti. Servis randevusu önerilir.",
                    "en": f"Routine maintenance for {dev.brand} {dev.model} is overdue. Service appointment recommended."
                }

                raw_insights.append({
                    "tenant_id": tenant_id,
                    "type": self.insight_id,
                    "category": "patient_care",
                    "entity_type": "device",
                    "entity_id": dev.id,
                    "priority": OpportunityPriority.MEDIUM,
                    "confidence_score": 0.85,
                    "impact_score": 0.55,
                    "title": self._get_localized_text(titles, locale),
                    "summary": self._get_localized_text(summaries, locale),
                    "recommended_capability": "schedule_appointment",
                    "recommended_action_label": self._get_localized_text({"tr": "Bakım Randevusu Al", "en": "Book Maintenance"}, locale)
                })
        return raw_insights

class BirthdayEngagementAnalyzer(BaseAnalyzer):
    """PC-009: Birthday Engagement."""
    insight_id = "PC-009"
    schedule = "daily"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc)
        
        # 1. Find patients with birthday today
        birthday_patients = self.db.query(Party).filter(
            Party.tenant_id == tenant_id,
            Party.status == PartyStatus.ACTIVE,
            extract('month', Party.birth_date) == now.month,
            extract('day', Party.birth_date) == now.day
        ).all()

        raw_insights = []
        for party in birthday_patients:
            titles = {
                "tr": f"Doğum Günü: {party.full_name}",
                "en": f"Birthday: {party.full_name}"
            }
            summaries = {
                "tr": "Hastanın bugün doğum günü. Özel bir kutlama mesajı veya indirim kodu gönderilebilir.",
                "en": "Patient's birthday is today. Send a greeting or a special discount code."
            }

            raw_insights.append({
                "tenant_id": tenant_id,
                "type": self.insight_id,
                "category": "patient_care",
                "entity_type": "party",
                "entity_id": party.id,
                "priority": OpportunityPriority.LOW,
                "confidence_score": 1.0,
                "impact_score": 0.30,
                "title": self._get_localized_text(titles, locale),
                "summary": self._get_localized_text(summaries, locale),
                "recommended_capability": "send_birthday_greeting",
                "recommended_action_label": self._get_localized_text({"tr": "Kutumla Mesajı Gönder", "en": "Send Greeting"}, locale)
            })
        return raw_insights

class BilateralUpgradeAnalyzer(BaseAnalyzer):
    """PC-010: Bilateral Upgrade Opportunity."""
    insight_id = "PC-010"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        # 1. Find patients with single device but bilateral loss
        # Simplified: Check patients with only 1 active device assignment
        raw_insights = []
        
        patients_with_one_device = self.db.query(
            DeviceAssignment.party_id,
            func.count(DeviceAssignment.id).label('dev_count')
        ).filter(
            DeviceAssignment.tenant_id == tenant_id,
            DeviceAssignment.ear.in_(['L', 'R'])
        ).group_by(DeviceAssignment.party_id).having(func.count(DeviceAssignment.id) == 1).all()

        for party_id, count in patients_with_one_device:
            # Check most recent hearing test results for bilateral loss
            latest_test = self.db.query(HearingTest).filter(
                HearingTest.party_id == party_id
            ).order_by(HearingTest.test_date.desc()).first()

            if not latest_test:
                continue
            
            # Logic: If results show loss in both ears (simplified check)
            results = latest_test.results_json
            if not results:
                continue
            
            # Simplified bilateral check: both ears have some recommendation or data
            if 'leftEar' in results and 'rightEar' in results:
                party = self.db.query(Party).filter(Party.id == party_id).first()
                if not party:
                    continue

                titles = {
                    "tr": f"Bilateral Yükseltme Fırsatı: {party.full_name}",
                    "en": f"Bilateral Upgrade Opportunity: {party.full_name}"
                }
                summaries = {
                    "tr": "Hasta şu an tek taraflı cihaz kullanıyor ancak son testi bilateral kayıp gösteriyor. Diğer kulak için cihaz teklif edilebilir.",
                    "en": "Patient uses a single device but recent test shows bilateral loss. Second device can be offered."
                }

                raw_insights.append({
                    "tenant_id": tenant_id,
                    "type": self.insight_id,
                    "category": "patient_care",
                    "entity_type": "party",
                    "entity_id": party.id,
                    "priority": OpportunityPriority.HIGH,
                    "confidence_score": 0.80,
                    "impact_score": 0.85,
                    "title": self._get_localized_text(titles, locale),
                    "summary": self._get_localized_text(summaries, locale),
                    "recommended_capability": "offer_bilateral_upgrade",
                    "recommended_action_label": self._get_localized_text({"tr": "Bilateral Teklif Ver", "en": "Offer Bilateral"}, locale)
                })
        return raw_insights


class AccessoryCrossSellAnalyzer(BaseAnalyzer):
    """PC-011: Accessory Cross-Sell Opportunity."""
    insight_id = "PC-011"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        """Find patients with devices but no accessory purchases in 6 months."""
        six_months = datetime.now(timezone.utc) - timedelta(days=180)
        # Patients with device assignments but no recent accessory sales
        patients_with_devices = self.db.query(DeviceAssignment.party_id).filter(DeviceAssignment.tenant_id == tenant_id, DeviceAssignment.status == "ASSIGNED").distinct().all()
        party_ids = [p[0] for p in patients_with_devices]
        if not party_ids:
            return []
        # Find those without recent accessory-category sales
        recent_buyers = self.db.query(Sale.party_id).filter(Sale.tenant_id == tenant_id, Sale.party_id.in_(party_ids), Sale.created_at >= six_months).distinct().all()
        recent_ids = {r[0] for r in recent_buyers}
        candidates = [pid for pid in party_ids if pid not in recent_ids]

        raw_insights = []
        for pid in candidates[:15]:
            party = self.db.query(Party).filter(Party.id == pid).first()
            if not party: continue
            name = f"{party.first_name} {party.last_name}"
            titles = {"tr": f"Aksesuar Satış Fırsatı: {name}", "en": f"Accessory Cross-Sell: {name}"}
            summaries = {"tr": f"{name} 6+ aydır aksesuar satın almadı. Pil, temizlik kiti vb. önerilebilir.", "en": f"{name} hasn't purchased accessories in 6+ months."}
            raw_insights.append({"tenant_id": tenant_id, "type": self.insight_id, "category": "patient_care", "entity_type": "party", "entity_id": pid, "priority": OpportunityPriority.LOW, "confidence_score": 0.75, "impact_score": 0.40, "title": self._get_localized_text(titles, locale), "summary": self._get_localized_text(summaries, locale), "recommended_capability": "notification_send", "recommended_action_label": self._get_localized_text({"tr": "Teklif Gönder", "en": "Send Offer"}, locale)})
        return raw_insights


class DeviceUpgradeAnalyzer(BaseAnalyzer):
    """PC-012: Device Upgrade Opportunity."""
    insight_id = "PC-012"
    schedule = "monthly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        """Find patients with devices older than 4 years — upgrade candidates."""
        four_years = datetime.now(timezone.utc) - timedelta(days=4*365)
        old_assignments = self.db.query(DeviceAssignment).filter(DeviceAssignment.tenant_id == tenant_id, DeviceAssignment.status == "ASSIGNED", DeviceAssignment.created_at < four_years).limit(20).all()
        raw_insights = []
        for da in old_assignments:
            party = self.db.query(Party).filter(Party.id == da.party_id).first()
            if not party: continue
            name = f"{party.first_name} {party.last_name}"
            titles = {"tr": f"Cihaz Yükseltme: {name}", "en": f"Device Upgrade: {name}"}
            summaries = {"tr": f"{name}'ın cihazı 4+ yıllık. Yeni teknoloji ile yükseltme önerilebilir.", "en": f"{name}'s device is 4+ years old. Upgrade recommended."}
            raw_insights.append({"tenant_id": tenant_id, "type": self.insight_id, "category": "patient_care", "entity_type": "party", "entity_id": da.party_id, "priority": OpportunityPriority.MEDIUM, "confidence_score": 0.85, "impact_score": 0.55, "title": self._get_localized_text(titles, locale), "summary": self._get_localized_text(summaries, locale), "recommended_capability": "getDeviceRecommendations", "recommended_action_label": self._get_localized_text({"tr": "Cihaz Öner", "en": "Recommend Device"}, locale)})
        return raw_insights


class ReferralOpportunityAnalyzer(BaseAnalyzer):
    """PC-013: Referral Opportunity Detection."""
    insight_id = "PC-013"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        """Find satisfied long-term patients who could refer others."""
        one_year = datetime.now(timezone.utc) - timedelta(days=365)
        loyal = self.db.query(Sale.party_id, func.count(Sale.id).label('cnt')).filter(Sale.tenant_id == tenant_id, Sale.status == 'completed').group_by(Sale.party_id).having(func.count(Sale.id) >= 3).all()
        raw_insights = []
        for pid, cnt in loyal[:10]:
            party = self.db.query(Party).filter(Party.id == pid).first()
            if not party: continue
            name = f"{party.first_name} {party.last_name}"
            titles = {"tr": f"Referans Fırsatı: {name}", "en": f"Referral Opportunity: {name}"}
            summaries = {"tr": f"{name} sadık müşteri ({cnt} satış). Referans programına davet edilebilir.", "en": f"{name} is a loyal customer ({cnt} sales). Referral invite recommended."}
            raw_insights.append({"tenant_id": tenant_id, "type": self.insight_id, "category": "patient_care", "entity_type": "party", "entity_id": pid, "priority": OpportunityPriority.LOW, "confidence_score": 0.80, "impact_score": 0.35, "title": self._get_localized_text(titles, locale), "summary": self._get_localized_text(summaries, locale), "recommended_capability": "notification_send", "recommended_action_label": self._get_localized_text({"tr": "Davet Gönder", "en": "Send Invite"}, locale)})
        return raw_insights


class PostFittingFollowUpAnalyzer(BaseAnalyzer):
    """PC-014: Post-Fitting Follow-Up."""
    insight_id = "PC-014"
    schedule = "weekly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        """Find patients who had a device fitting 2-4 weeks ago with no follow-up."""
        two_weeks = datetime.now(timezone.utc) - timedelta(days=14)
        four_weeks = datetime.now(timezone.utc) - timedelta(days=28)
        # Fittings 2-4 weeks ago
        fittings = self.db.query(Appointment).filter(Appointment.tenant_id == tenant_id, Appointment.appointment_type == 'device_fitting', Appointment.status == 'COMPLETED', Appointment.date >= four_weeks, Appointment.date <= two_weeks).all()
        raw_insights = []
        for apt in fittings:
            # Check no follow-up scheduled
            followup = self.db.query(Appointment).filter(Appointment.tenant_id == tenant_id, Appointment.party_id == apt.party_id, Appointment.date > apt.date, Appointment.status != 'cancelled').first()
            if followup: continue
            party = self.db.query(Party).filter(Party.id == apt.party_id).first()
            if not party: continue
            name = f"{party.first_name} {party.last_name}"
            titles = {"tr": f"Fitting Sonrası Kontrol: {name}", "en": f"Post-Fitting Follow-Up: {name}"}
            summaries = {"tr": f"{name} 2-4 hafta önce cihaz fitting yaptı ama kontrol randevusu yok.", "en": f"{name} had fitting 2-4 weeks ago but no follow-up scheduled."}
            raw_insights.append({"tenant_id": tenant_id, "type": self.insight_id, "category": "patient_care", "entity_type": "party", "entity_id": apt.party_id, "priority": OpportunityPriority.HIGH, "confidence_score": 0.90, "impact_score": 0.65, "title": self._get_localized_text(titles, locale), "summary": self._get_localized_text(summaries, locale), "recommended_capability": "createAppointment", "recommended_action_label": self._get_localized_text({"tr": "Kontrol Randevusu Oluştur", "en": "Schedule Follow-Up"}, locale)})
        return raw_insights


class SeasonalCampaignAnalyzer(BaseAnalyzer):
    """PC-015: Seasonal Campaign Trigger."""
    insight_id = "PC-015"
    schedule = "monthly"

    async def analyze(self, tenant_id: str, locale: str = "tr") -> List[Dict[str, Any]]:
        """Suggest seasonal campaigns based on time of year."""
        month = datetime.now().month
        raw_insights = []
        campaigns = {
            1: ("Yeni Yıl Kampanyası", "New Year Campaign", "Yeni yıl indirimi ile hasta çekimi artırılabilir."),
            3: ("Dünya İşitme Günü", "World Hearing Day", "3 Mart Dünya İşitme Günü için farkındalık kampanyası."),
            5: ("Anneler Günü", "Mother's Day", "Anneler gününe özel işitme cihazı kampanyası."),
            9: ("Okul Dönemi", "Back to School", "Çocuk hastaları için okul dönemi işitme kontrolü hatırlatması."),
            11: ("Kış Bakım", "Winter Care", "Kış aylarında cihaz bakım kampanyası."),
        }
        if month in campaigns:
            tr_name, en_name, desc = campaigns[month]
            titles = {"tr": f"Sezonsal Kampanya: {tr_name}", "en": f"Seasonal Campaign: {en_name}"}
            summaries = {"tr": desc, "en": f"Consider running a {en_name} promotion this month."}
            raw_insights.append({"tenant_id": tenant_id, "type": self.insight_id, "category": "patient_care", "entity_type": "campaign", "entity_id": f"seasonal_{month}", "priority": OpportunityPriority.LOW, "confidence_score": 0.70, "impact_score": 0.35, "title": self._get_localized_text(titles, locale), "summary": self._get_localized_text(summaries, locale), "recommended_capability": "createCampaign", "recommended_action_label": self._get_localized_text({"tr": "Kampanya Oluştur", "en": "Create Campaign"}, locale)})
        return raw_insights
