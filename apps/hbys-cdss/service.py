"""
CDSS Service - Clinical Decision Support Engine.
Business logic for drug interaction checks, allergy verification, dose warnings,
critical lab detection, duplicate order detection, and protocol management.
"""
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, List

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from hbys_common.database import gen_id, now_utc
from models.clinical_alert import ClinicalAlert
from models.patient_allergy import PatientAllergy
from models.clinical_protocol import ClinicalProtocol
from schemas import (
    PatientAllergyCreate,
    PatientAllergyUpdate,
    PatientAllergyRead,
    PatientAllergyListResponse,
    ClinicalAlertRead,
    AlertListResponse,
    ClinicalProtocolCreate,
    ClinicalProtocolUpdate,
    ClinicalProtocolRead,
    ClinicalProtocolListResponse,
    PrescriptionCheckRequest,
    PrescriptionCheckResponse,
    CDSSAlertItem,
    LabResultCheckRequest,
    LabResultCheckResponse,
    DuplicateOrderCheckRequest,
    DuplicateOrderCheckResponse,
)

logger = logging.getLogger(__name__)


# ============================================================================
# KNOWN DRUG INTERACTION DATABASE (in-memory reference)
# In production, this would be a proper drug interaction database or API.
# ============================================================================

# ATC code prefix pairs that interact
_DRUG_INTERACTIONS = [
    # Warfarin + NSAIDs
    {"drug_a": "B01AA", "drug_b": "M01A", "severity": "critical",
     "title_tr": "Varfarin - NSAID Etkileşimi",
     "message_tr": "Varfarin ile NSAID birlikte kullanımı kanama riskini ciddi şekilde artırır."},
    # ACE inhibitors + Potassium-sparing diuretics
    {"drug_a": "C09A", "drug_b": "C03DA", "severity": "critical",
     "title_tr": "ACE İnhibitörü - K+ Tutucu Diüretik Etkileşimi",
     "message_tr": "Birlikte kullanım hiperkalemi riskini artırır. Potasyum seviyesi izlenmelidir."},
    # SSRIs + MAOIs
    {"drug_a": "N06AB", "drug_b": "N06AF", "severity": "critical",
     "title_tr": "SSRI - MAO İnhibitörü Etkileşimi",
     "message_tr": "Birlikte kullanım serotonin sendromuna yol açabilir. Kontrendikedir."},
    # Metformin + Contrast media (iodinated)
    {"drug_a": "A10BA", "drug_b": "V08A", "severity": "warning",
     "title_tr": "Metformin - İyotlu Kontrast Madde Etkileşimi",
     "message_tr": "Kontrast madde uygulaması öncesi metformin kesilmelidir (laktik asidoz riski)."},
    # Digoxin + Amiodarone
    {"drug_a": "C01AA", "drug_b": "C01BD01", "severity": "critical",
     "title_tr": "Digoksin - Amiodaron Etkileşimi",
     "message_tr": "Amiodaron digoksin düzeyini artırır. Doz ayarlaması gereklidir."},
    # Statins + Macrolides
    {"drug_a": "C10AA", "drug_b": "J01FA", "severity": "warning",
     "title_tr": "Statin - Makrolid Antibiyotik Etkileşimi",
     "message_tr": "Makrolid antibiyotikler statin düzeyini artırabilir (rabdomiyoliz riski)."},
    # Ciprofloxacin + Theophylline
    {"drug_a": "J01MA02", "drug_b": "R03DA04", "severity": "warning",
     "title_tr": "Siprofloksasin - Teofilin Etkileşimi",
     "message_tr": "Siprofloksasin teofilin düzeyini artırır. Teofilin düzeyi monitörize edilmelidir."},
    # Lithium + NSAIDs
    {"drug_a": "N05AN", "drug_b": "M01A", "severity": "critical",
     "title_tr": "Lityum - NSAID Etkileşimi",
     "message_tr": "NSAID'ler lityum düzeyini artırır. Lityum toksisitesi riski mevcuttur."},
    # Clopidogrel + PPIs (omeprazole)
    {"drug_a": "B01AC04", "drug_b": "A02BC01", "severity": "warning",
     "title_tr": "Klopidogrel - Omeprazol Etkileşimi",
     "message_tr": "Omeprazol klopidogrelin etkinliğini azaltabilir. Pantoprazol tercih edilmelidir."},
    # Fluoroquinolones + Antacids
    {"drug_a": "J01MA", "drug_b": "A02A", "severity": "info",
     "title_tr": "Florokinolon - Antasit Etkileşimi",
     "message_tr": "Antasitler florokinolon emilimini azaltır. En az 2 saat arayla alınmalıdır."},
]

# Critical lab thresholds
_CRITICAL_LAB_THRESHOLDS = {
    "GLU": {"name": "Glukoz", "low": 50, "high": 500, "unit": "mg/dL"},
    "K": {"name": "Potasyum", "low": 2.5, "high": 6.5, "unit": "mEq/L"},
    "NA": {"name": "Sodyum", "low": 120, "high": 160, "unit": "mEq/L"},
    "CA": {"name": "Kalsiyum", "low": 6.0, "high": 13.0, "unit": "mg/dL"},
    "HGB": {"name": "Hemoglobin", "low": 5.0, "high": 20.0, "unit": "g/dL"},
    "PLT": {"name": "Trombosit", "low": 20000, "high": 1000000, "unit": "/uL"},
    "WBC": {"name": "Lökosit", "low": 1000, "high": 50000, "unit": "/uL"},
    "CRE": {"name": "Kreatinin", "low": 0.1, "high": 10.0, "unit": "mg/dL"},
    "INR": {"name": "INR", "low": 0.5, "high": 5.0, "unit": ""},
    "TROP": {"name": "Troponin", "low": None, "high": 0.04, "unit": "ng/mL"},
    "LAC": {"name": "Laktat", "low": None, "high": 4.0, "unit": "mmol/L"},
    "PH": {"name": "pH (Kan Gazı)", "low": 7.2, "high": 7.6, "unit": ""},
}


# ============================================================================
# CDSS ENGINE - Drug Interaction Check
# ============================================================================


def check_drug_interactions(
    medications: list,
) -> List[CDSSAlertItem]:
    """
    Check for known drug-drug interactions among a list of medications.
    Each medication should have an 'atc_code' field.
    """
    alerts: List[CDSSAlertItem] = []
    atc_codes = [m.atc_code for m in medications if m.atc_code]

    for i, code_a in enumerate(atc_codes):
        for code_b in atc_codes[i + 1:]:
            for interaction in _DRUG_INTERACTIONS:
                a_match = code_a.startswith(interaction["drug_a"]) or code_b.startswith(interaction["drug_a"])
                b_match = code_b.startswith(interaction["drug_b"]) or code_a.startswith(interaction["drug_b"])
                if a_match and b_match:
                    alerts.append(CDSSAlertItem(
                        alert_type="drug_interaction",
                        severity=interaction["severity"],
                        title=interaction["title_tr"],
                        message=interaction["message_tr"],
                        details={
                            "drug_a_atc": code_a,
                            "drug_b_atc": code_b,
                        },
                    ))
    return alerts


# ============================================================================
# CDSS ENGINE - Drug Allergy Check
# ============================================================================


def check_drug_allergies(
    db: Session,
    patient_id: str,
    tenant_id: str,
    medications: list,
) -> List[CDSSAlertItem]:
    """
    Check prescribed medications against patient's known allergies.
    """
    alerts: List[CDSSAlertItem] = []

    allergies = (
        db.query(PatientAllergy)
        .filter(
            PatientAllergy.patient_id == patient_id,
            PatientAllergy.tenant_id == tenant_id,
            PatientAllergy.is_active == True,  # noqa: E712
            PatientAllergy.allergen_type == "medication",
        )
        .all()
    )

    if not allergies:
        return alerts

    for med in medications:
        med_name_lower = med.medication_name.lower()
        med_atc = med.atc_code or ""

        for allergy in allergies:
            allergen_lower = allergy.allergen_name.lower()
            allergen_code = allergy.allergen_code or ""

            # Match by name substring or ATC code prefix
            name_match = allergen_lower in med_name_lower or med_name_lower in allergen_lower
            code_match = (
                allergen_code and med_atc and
                (med_atc.startswith(allergen_code) or allergen_code.startswith(med_atc))
            )

            if name_match or code_match:
                severity = "critical" if allergy.severity in ("severe", "life_threatening") else "warning"
                alerts.append(CDSSAlertItem(
                    alert_type="drug_allergy",
                    severity=severity,
                    title=f"Alerji Uyarısı: {med.medication_name}",
                    message=(
                        f"Hasta '{allergy.allergen_name}' alerjisi kayıtlıdır. "
                        f"Reaksiyon: {allergy.reaction}. Şiddet: {allergy.severity}."
                    ),
                    details={
                        "medication_name": med.medication_name,
                        "allergen_name": allergy.allergen_name,
                        "reaction": allergy.reaction,
                        "allergy_severity": allergy.severity,
                        "allergy_id": allergy.id,
                    },
                ))
    return alerts


# ============================================================================
# CDSS ENGINE - Dose Check
# ============================================================================

# Common max daily doses (simplified reference)
_MAX_DAILY_DOSES = {
    "N02BE01": {"name": "Parasetamol", "max_dose": 4000, "unit": "mg"},
    "M01AE01": {"name": "İbuprofen", "max_dose": 2400, "unit": "mg"},
    "N02BA01": {"name": "Aspirin", "max_dose": 4000, "unit": "mg"},
    "A10BA02": {"name": "Metformin", "max_dose": 3000, "unit": "mg"},
    "C07AB02": {"name": "Metoprolol", "max_dose": 400, "unit": "mg"},
    "C09AA02": {"name": "Enalapril", "max_dose": 40, "unit": "mg"},
    "C03CA01": {"name": "Furosemid", "max_dose": 600, "unit": "mg"},
    "J01CA04": {"name": "Amoksisilin", "max_dose": 3000, "unit": "mg"},
    "J01FA10": {"name": "Azitromisin", "max_dose": 500, "unit": "mg"},
    "A02BC01": {"name": "Omeprazol", "max_dose": 40, "unit": "mg"},
}


def check_dose(medications: list) -> List[CDSSAlertItem]:
    """
    Check if any medication doses exceed known maximum daily doses.
    """
    alerts: List[CDSSAlertItem] = []

    for med in medications:
        if not med.atc_code or not med.dose:
            continue

        ref = _MAX_DAILY_DOSES.get(med.atc_code)
        if not ref:
            continue

        if med.dose > ref["max_dose"]:
            alerts.append(CDSSAlertItem(
                alert_type="dose_warning",
                severity="critical",
                title=f"Doz Aşımı Uyarısı: {med.medication_name}",
                message=(
                    f"{med.medication_name} için yazılan doz ({med.dose} {med.dose_unit}) "
                    f"maksimum günlük dozu ({ref['max_dose']} {ref['unit']}) aşmaktadır."
                ),
                details={
                    "medication_name": med.medication_name,
                    "prescribed_dose": med.dose,
                    "prescribed_unit": med.dose_unit,
                    "max_daily_dose": ref["max_dose"],
                    "max_unit": ref["unit"],
                    "atc_code": med.atc_code,
                },
            ))
        elif med.dose > ref["max_dose"] * 0.8:
            alerts.append(CDSSAlertItem(
                alert_type="dose_warning",
                severity="warning",
                title=f"Yüksek Doz Uyarısı: {med.medication_name}",
                message=(
                    f"{med.medication_name} için yazılan doz ({med.dose} {med.dose_unit}) "
                    f"maksimum günlük dozun %80'ini ({ref['max_dose']} {ref['unit']}) aşmaktadır."
                ),
                details={
                    "medication_name": med.medication_name,
                    "prescribed_dose": med.dose,
                    "max_daily_dose": ref["max_dose"],
                    "atc_code": med.atc_code,
                },
            ))
    return alerts


# ============================================================================
# CDSS ENGINE - Critical Lab Check
# ============================================================================


def check_critical_lab(
    test_code: str,
    test_name: str,
    value: float,
    unit: str,
    reference_min: Optional[float] = None,
    reference_max: Optional[float] = None,
) -> List[CDSSAlertItem]:
    """
    Check if a lab result is critically abnormal.
    Uses built-in thresholds and/or provided reference ranges.
    """
    alerts: List[CDSSAlertItem] = []
    code_upper = test_code.upper()

    threshold = _CRITICAL_LAB_THRESHOLDS.get(code_upper)

    # Determine effective thresholds
    eff_low = None
    eff_high = None

    if threshold:
        eff_low = threshold.get("low")
        eff_high = threshold.get("high")

    # Override with explicit reference ranges if provided
    if reference_min is not None:
        eff_low = reference_min
    if reference_max is not None:
        eff_high = reference_max

    display_name = threshold["name"] if threshold else test_name

    if eff_low is not None and value < eff_low:
        severity = "critical"
        alerts.append(CDSSAlertItem(
            alert_type="critical_lab",
            severity=severity,
            title=f"Kritik Düşük Değer: {display_name}",
            message=(
                f"{display_name} değeri ({value} {unit}) kritik alt sınırın "
                f"({eff_low} {unit}) altındadır. Acil değerlendirme gereklidir."
            ),
            details={
                "test_code": test_code,
                "test_name": display_name,
                "value": value,
                "unit": unit,
                "threshold_low": eff_low,
                "threshold_high": eff_high,
                "direction": "low",
            },
        ))

    if eff_high is not None and value > eff_high:
        severity = "critical"
        alerts.append(CDSSAlertItem(
            alert_type="critical_lab",
            severity=severity,
            title=f"Kritik Yüksek Değer: {display_name}",
            message=(
                f"{display_name} değeri ({value} {unit}) kritik üst sınırın "
                f"({eff_high} {unit}) üzerindedir. Acil değerlendirme gereklidir."
            ),
            details={
                "test_code": test_code,
                "test_name": display_name,
                "value": value,
                "unit": unit,
                "threshold_low": eff_low,
                "threshold_high": eff_high,
                "direction": "high",
            },
        ))

    return alerts


# ============================================================================
# CDSS ENGINE - Duplicate Order Check
# ============================================================================


def check_duplicate_orders(
    db: Session,
    patient_id: str,
    tenant_id: str,
    order_type: str,
    item_codes: List[str],
    hours_lookback: int = 24,
) -> List[CDSSAlertItem]:
    """
    Check for duplicate orders within the lookback window.
    Looks at existing alerts of type 'duplicate_order' and existing orders.
    """
    alerts: List[CDSSAlertItem] = []
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours_lookback)

    # Check for recently created alerts for the same patient with duplicate_order type
    existing_alerts = (
        db.query(ClinicalAlert)
        .filter(
            ClinicalAlert.patient_id == patient_id,
            ClinicalAlert.tenant_id == tenant_id,
            ClinicalAlert.alert_type == "duplicate_order",
            ClinicalAlert.status == "active",
            ClinicalAlert.created_at >= cutoff,
        )
        .all()
    )

    existing_codes = set()
    for alert in existing_alerts:
        details = ClinicalAlert.json_load_field(alert.details)
        if details and isinstance(details, dict):
            code = details.get("item_code")
            if code:
                existing_codes.add(code)

    for code in item_codes:
        if code in existing_codes:
            alerts.append(CDSSAlertItem(
                alert_type="duplicate_order",
                severity="warning",
                title=f"Tekrarlayan İstek Uyarısı: {code}",
                message=(
                    f"Bu hasta için son {hours_lookback} saat içinde '{code}' "
                    f"kodlu {order_type} isteği zaten verilmiştir."
                ),
                details={
                    "item_code": code,
                    "order_type": order_type,
                    "hours_lookback": hours_lookback,
                },
            ))

    return alerts


# ============================================================================
# COMBINED PRESCRIPTION CHECK
# ============================================================================


def check_prescription(
    db: Session,
    data: PrescriptionCheckRequest,
    tenant_id: str,
) -> PrescriptionCheckResponse:
    """
    Run all CDSS checks on a prescription: interactions, allergies, dose.
    Persists generated alerts to the database.
    """
    all_alerts: List[CDSSAlertItem] = []

    # 1. Drug interactions
    interaction_alerts = check_drug_interactions(data.medications)
    all_alerts.extend(interaction_alerts)

    # 2. Drug allergies
    allergy_alerts = check_drug_allergies(db, data.patient_id, tenant_id, data.medications)
    all_alerts.extend(allergy_alerts)

    # 3. Dose check
    dose_alerts = check_dose(data.medications)
    all_alerts.extend(dose_alerts)

    # Persist alerts to database
    for alert_item in all_alerts:
        db_alert = ClinicalAlert(
            id=gen_id("cla"),
            patient_id=data.patient_id,
            encounter_id=data.encounter_id,
            alert_type=alert_item.alert_type,
            severity=alert_item.severity,
            title=alert_item.title,
            message=alert_item.message,
            details=json.dumps(alert_item.details, ensure_ascii=False) if alert_item.details else None,
            source_type="prescription",
            source_id=None,
            status="active",
            tenant_id=tenant_id,
        )
        db.add(db_alert)

    if all_alerts:
        db.commit()

    has_critical = any(a.severity == "critical" for a in all_alerts)

    return PrescriptionCheckResponse(
        patient_id=data.patient_id,
        alerts=all_alerts,
        alert_count=len(all_alerts),
        has_critical=has_critical,
        can_proceed=not has_critical,
    )


def check_lab_result(
    db: Session,
    data: LabResultCheckRequest,
    tenant_id: str,
) -> LabResultCheckResponse:
    """
    Check a lab result for critical values and persist alerts.
    """
    alerts = check_critical_lab(
        test_code=data.test_code,
        test_name=data.test_name,
        value=data.value,
        unit=data.unit,
        reference_min=data.reference_min,
        reference_max=data.reference_max,
    )

    # Persist alerts
    for alert_item in alerts:
        db_alert = ClinicalAlert(
            id=gen_id("cla"),
            patient_id=data.patient_id,
            encounter_id=data.encounter_id,
            alert_type=alert_item.alert_type,
            severity=alert_item.severity,
            title=alert_item.title,
            message=alert_item.message,
            details=json.dumps(alert_item.details, ensure_ascii=False) if alert_item.details else None,
            source_type="lab_order",
            source_id=None,
            status="active",
            tenant_id=tenant_id,
        )
        db.add(db_alert)

    if alerts:
        db.commit()

    return LabResultCheckResponse(
        patient_id=data.patient_id,
        test_code=data.test_code,
        is_critical=len(alerts) > 0,
        alerts=alerts,
    )


def check_duplicate_order(
    db: Session,
    data: DuplicateOrderCheckRequest,
    tenant_id: str,
) -> DuplicateOrderCheckResponse:
    """
    Check for duplicate orders and persist alerts.
    """
    alerts = check_duplicate_orders(
        db=db,
        patient_id=data.patient_id,
        tenant_id=tenant_id,
        order_type=data.order_type,
        item_codes=data.item_codes,
        hours_lookback=data.hours_lookback,
    )

    # Persist alerts
    for alert_item in alerts:
        db_alert = ClinicalAlert(
            id=gen_id("cla"),
            patient_id=data.patient_id,
            encounter_id=None,
            alert_type=alert_item.alert_type,
            severity=alert_item.severity,
            title=alert_item.title,
            message=alert_item.message,
            details=json.dumps(alert_item.details, ensure_ascii=False) if alert_item.details else None,
            source_type=data.order_type,
            source_id=None,
            status="active",
            tenant_id=tenant_id,
        )
        db.add(db_alert)

    if alerts:
        db.commit()

    return DuplicateOrderCheckResponse(
        patient_id=data.patient_id,
        duplicates_found=len(alerts) > 0,
        alerts=alerts,
    )


# ============================================================================
# PATIENT ALLERGY CRUD
# ============================================================================


def create_allergy(
    db: Session,
    data: PatientAllergyCreate,
    tenant_id: str,
) -> PatientAllergy:
    """Create a new patient allergy record."""
    allergy = PatientAllergy(
        id=gen_id("alg"),
        patient_id=data.patient_id,
        allergen_type=data.allergen_type.value if hasattr(data.allergen_type, "value") else data.allergen_type,
        allergen_name=data.allergen_name,
        allergen_code=data.allergen_code,
        reaction=data.reaction,
        severity=data.severity.value if hasattr(data.severity, "value") else data.severity,
        onset_date=data.onset_date,
        is_active=data.is_active,
        notes=data.notes,
        recorded_by=data.recorded_by,
        tenant_id=tenant_id,
    )
    db.add(allergy)
    db.commit()
    db.refresh(allergy)
    logger.info("Patient allergy created: id=%s, patient=%s", allergy.id, data.patient_id)
    return allergy


def list_allergies(
    db: Session,
    patient_id: str,
    tenant_id: str,
    active_only: bool = True,
    skip: int = 0,
    limit: int = 50,
) -> PatientAllergyListResponse:
    """List allergies for a patient."""
    query = db.query(PatientAllergy).filter(
        PatientAllergy.patient_id == patient_id,
        PatientAllergy.tenant_id == tenant_id,
    )
    if active_only:
        query = query.filter(PatientAllergy.is_active == True)  # noqa: E712

    total = query.count()
    items = query.order_by(PatientAllergy.created_at.desc()).offset(skip).limit(limit).all()

    return PatientAllergyListResponse(
        items=[PatientAllergyRead.model_validate(i) for i in items],
        total=total,
    )


def get_allergy(
    db: Session, allergy_id: str, tenant_id: str
) -> Optional[PatientAllergy]:
    """Get a single allergy by ID."""
    return (
        db.query(PatientAllergy)
        .filter(PatientAllergy.id == allergy_id, PatientAllergy.tenant_id == tenant_id)
        .first()
    )


def update_allergy(
    db: Session,
    allergy_id: str,
    data: PatientAllergyUpdate,
    tenant_id: str,
) -> Optional[PatientAllergy]:
    """Update an existing allergy record."""
    allergy = get_allergy(db, allergy_id, tenant_id)
    if not allergy:
        return None

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(value, "value"):
            value = value.value
        setattr(allergy, field, value)

    db.commit()
    db.refresh(allergy)
    logger.info("Patient allergy updated: id=%s", allergy_id)
    return allergy


def delete_allergy(
    db: Session, allergy_id: str, tenant_id: str
) -> bool:
    """Delete an allergy record."""
    allergy = get_allergy(db, allergy_id, tenant_id)
    if not allergy:
        return False
    db.delete(allergy)
    db.commit()
    logger.info("Patient allergy deleted: id=%s", allergy_id)
    return True


# ============================================================================
# CLINICAL ALERT MANAGEMENT
# ============================================================================


def list_alerts(
    db: Session,
    tenant_id: str,
    patient_id: Optional[str] = None,
    status: Optional[str] = None,
    alert_type: Optional[str] = None,
    severity: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> AlertListResponse:
    """List clinical alerts with optional filters."""
    query = db.query(ClinicalAlert).filter(ClinicalAlert.tenant_id == tenant_id)

    if patient_id:
        query = query.filter(ClinicalAlert.patient_id == patient_id)
    if status:
        query = query.filter(ClinicalAlert.status == status)
    if alert_type:
        query = query.filter(ClinicalAlert.alert_type == alert_type)
    if severity:
        query = query.filter(ClinicalAlert.severity == severity)

    total = query.count()
    items = query.order_by(ClinicalAlert.created_at.desc()).offset(skip).limit(limit).all()

    return AlertListResponse(
        items=[ClinicalAlertRead.model_validate(i) for i in items],
        total=total,
    )


def get_alert(
    db: Session, alert_id: str, tenant_id: str
) -> Optional[ClinicalAlert]:
    """Get a single alert by ID."""
    return (
        db.query(ClinicalAlert)
        .filter(ClinicalAlert.id == alert_id, ClinicalAlert.tenant_id == tenant_id)
        .first()
    )


def acknowledge_alert(
    db: Session,
    alert_id: str,
    acknowledged_by: str,
    tenant_id: str,
) -> Optional[ClinicalAlert]:
    """Mark an alert as acknowledged."""
    alert = get_alert(db, alert_id, tenant_id)
    if not alert:
        return None
    if alert.status != "active":
        return alert

    alert.status = "acknowledged"
    alert.acknowledged_by = acknowledged_by
    alert.acknowledged_at = now_utc()
    db.commit()
    db.refresh(alert)
    logger.info("Alert acknowledged: id=%s by=%s", alert_id, acknowledged_by)
    return alert


def override_alert(
    db: Session,
    alert_id: str,
    overridden_by: str,
    override_reason: str,
    tenant_id: str,
) -> Optional[ClinicalAlert]:
    """Override an alert with a clinical justification."""
    alert = get_alert(db, alert_id, tenant_id)
    if not alert:
        return None

    alert.status = "overridden"
    alert.acknowledged_by = overridden_by
    alert.acknowledged_at = now_utc()
    alert.override_reason = override_reason
    db.commit()
    db.refresh(alert)
    logger.info("Alert overridden: id=%s by=%s reason=%s", alert_id, overridden_by, override_reason[:50])
    return alert


# ============================================================================
# CLINICAL PROTOCOL CRUD
# ============================================================================


def create_protocol(
    db: Session,
    data: ClinicalProtocolCreate,
) -> ClinicalProtocol:
    """Create a new clinical protocol (not tenant-scoped)."""
    protocol = ClinicalProtocol(
        id=gen_id("cpr"),
        name_tr=data.name_tr,
        name_en=data.name_en,
        icd_codes=json.dumps(data.icd_codes, ensure_ascii=False) if data.icd_codes else None,
        specialty=data.specialty,
        protocol_type=data.protocol_type.value if hasattr(data.protocol_type, "value") else data.protocol_type,
        description=data.description,
        steps=json.dumps(data.steps, ensure_ascii=False) if data.steps else None,
        contraindications=json.dumps(data.contraindications, ensure_ascii=False) if data.contraindications else None,
        evidence_level=data.evidence_level,
        is_active=data.is_active,
        version=data.version,
    )
    db.add(protocol)
    db.commit()
    db.refresh(protocol)
    logger.info("Clinical protocol created: id=%s, name=%s", protocol.id, data.name_tr)
    return protocol


def list_protocols(
    db: Session,
    specialty: Optional[str] = None,
    protocol_type: Optional[str] = None,
    active_only: bool = True,
    skip: int = 0,
    limit: int = 50,
) -> ClinicalProtocolListResponse:
    """List clinical protocols with optional filters."""
    query = db.query(ClinicalProtocol)

    if active_only:
        query = query.filter(ClinicalProtocol.is_active == True)  # noqa: E712
    if specialty:
        query = query.filter(ClinicalProtocol.specialty == specialty)
    if protocol_type:
        query = query.filter(ClinicalProtocol.protocol_type == protocol_type)

    total = query.count()
    items = query.order_by(ClinicalProtocol.name_tr).offset(skip).limit(limit).all()

    return ClinicalProtocolListResponse(
        items=[ClinicalProtocolRead.model_validate(i) for i in items],
        total=total,
    )


def get_protocol(
    db: Session, protocol_id: str
) -> Optional[ClinicalProtocol]:
    """Get a single protocol by ID."""
    return db.query(ClinicalProtocol).filter(ClinicalProtocol.id == protocol_id).first()


def update_protocol(
    db: Session,
    protocol_id: str,
    data: ClinicalProtocolUpdate,
) -> Optional[ClinicalProtocol]:
    """Update an existing clinical protocol."""
    protocol = get_protocol(db, protocol_id)
    if not protocol:
        return None

    update_data = data.model_dump(exclude_unset=True)

    # Handle JSON fields specially
    json_fields = {"icd_codes", "steps", "contraindications"}
    for field, value in update_data.items():
        if field in json_fields and value is not None:
            value = json.dumps(value, ensure_ascii=False)
        if hasattr(value, "value"):
            value = value.value
        setattr(protocol, field, value)

    db.commit()
    db.refresh(protocol)
    logger.info("Clinical protocol updated: id=%s", protocol_id)
    return protocol


def delete_protocol(
    db: Session, protocol_id: str
) -> bool:
    """Delete a clinical protocol."""
    protocol = get_protocol(db, protocol_id)
    if not protocol:
        return False
    db.delete(protocol)
    db.commit()
    logger.info("Clinical protocol deleted: id=%s", protocol_id)
    return True


def search_protocols(
    db: Session,
    q: str,
    specialty: Optional[str] = None,
    limit: int = 20,
) -> ClinicalProtocolListResponse:
    """Search protocols by name or ICD code."""
    like_pattern = f"%{q.strip()}%"
    query = db.query(ClinicalProtocol).filter(
        ClinicalProtocol.is_active == True,  # noqa: E712
        or_(
            ClinicalProtocol.name_tr.ilike(like_pattern),
            ClinicalProtocol.name_en.ilike(like_pattern),
            ClinicalProtocol.icd_codes.ilike(like_pattern),
            ClinicalProtocol.description.ilike(like_pattern),
        ),
    )

    if specialty:
        query = query.filter(ClinicalProtocol.specialty == specialty)

    total = query.count()
    items = query.order_by(ClinicalProtocol.name_tr).limit(limit).all()

    return ClinicalProtocolListResponse(
        items=[ClinicalProtocolRead.model_validate(i) for i in items],
        total=total,
    )


def get_protocols_for_diagnosis(
    db: Session,
    icd_code: str,
) -> ClinicalProtocolListResponse:
    """Find protocols associated with a specific ICD code."""
    like_pattern = f"%\"{icd_code}\"%"
    query = db.query(ClinicalProtocol).filter(
        ClinicalProtocol.is_active == True,  # noqa: E712
        ClinicalProtocol.icd_codes.ilike(like_pattern),
    )

    total = query.count()
    items = query.order_by(ClinicalProtocol.name_tr).all()

    return ClinicalProtocolListResponse(
        items=[ClinicalProtocolRead.model_validate(i) for i in items],
        total=total,
    )
