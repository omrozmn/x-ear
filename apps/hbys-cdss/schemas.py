"""
Pydantic v2 schemas for the CDSS (Clinical Decision Support) Service.
"""
from datetime import date, datetime
from enum import Enum
from typing import Optional, List, Any

from pydantic import Field

from hbys_common.schemas import AppBaseModel, IDMixin, TimestampMixin


# --- Enums ----------------------------------------------------------------


class AlertTypeEnum(str, Enum):
    drug_interaction = "drug_interaction"
    drug_allergy = "drug_allergy"
    dose_warning = "dose_warning"
    critical_lab = "critical_lab"
    duplicate_order = "duplicate_order"
    contraindication = "contraindication"
    age_warning = "age_warning"
    pregnancy_warning = "pregnancy_warning"


class AlertSeverityEnum(str, Enum):
    info = "info"
    warning = "warning"
    critical = "critical"


class AlertStatusEnum(str, Enum):
    active = "active"
    acknowledged = "acknowledged"
    overridden = "overridden"
    resolved = "resolved"


class AllergenTypeEnum(str, Enum):
    medication = "medication"
    food = "food"
    environmental = "environmental"
    latex = "latex"
    contrast = "contrast"
    other = "other"


class AllergySeverityEnum(str, Enum):
    mild = "mild"
    moderate = "moderate"
    severe = "severe"
    life_threatening = "life_threatening"


class ProtocolTypeEnum(str, Enum):
    treatment = "treatment"
    diagnostic = "diagnostic"
    preventive = "preventive"
    follow_up = "follow_up"


# --- Clinical Alert Schemas -----------------------------------------------


class ClinicalAlertRead(AppBaseModel, IDMixin, TimestampMixin):
    patient_id: str
    encounter_id: Optional[str] = None
    alert_type: str
    severity: str
    title: str
    message: str
    details: Optional[Any] = None
    source_type: Optional[str] = None
    source_id: Optional[str] = None
    status: str
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    override_reason: Optional[str] = None
    tenant_id: Optional[str] = None


class AlertAcknowledge(AppBaseModel):
    """Schema for acknowledging an alert."""
    acknowledged_by: str = Field(..., max_length=50, description="User ID acknowledging")


class AlertOverride(AppBaseModel):
    """Schema for overriding an alert with a reason."""
    overridden_by: str = Field(..., max_length=50, description="User ID overriding")
    override_reason: str = Field(
        ..., min_length=5, max_length=1000, description="Clinical justification for override"
    )


class AlertListResponse(AppBaseModel):
    items: List[ClinicalAlertRead]
    total: int


# --- Patient Allergy Schemas -----------------------------------------------


class PatientAllergyCreate(AppBaseModel):
    patient_id: str = Field(..., max_length=50)
    allergen_type: AllergenTypeEnum
    allergen_name: str = Field(..., max_length=300)
    allergen_code: Optional[str] = Field(None, max_length=50)
    reaction: str = Field(..., max_length=500)
    severity: AllergySeverityEnum = AllergySeverityEnum.moderate
    onset_date: Optional[date] = None
    is_active: bool = True
    notes: Optional[str] = None
    recorded_by: Optional[str] = Field(None, max_length=50)


class PatientAllergyUpdate(AppBaseModel):
    allergen_type: Optional[AllergenTypeEnum] = None
    allergen_name: Optional[str] = Field(None, max_length=300)
    allergen_code: Optional[str] = Field(None, max_length=50)
    reaction: Optional[str] = Field(None, max_length=500)
    severity: Optional[AllergySeverityEnum] = None
    onset_date: Optional[date] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None
    recorded_by: Optional[str] = Field(None, max_length=50)


class PatientAllergyRead(AppBaseModel, IDMixin, TimestampMixin):
    patient_id: str
    allergen_type: str
    allergen_name: str
    allergen_code: Optional[str] = None
    reaction: str
    severity: str
    onset_date: Optional[date] = None
    is_active: bool = True
    notes: Optional[str] = None
    recorded_by: Optional[str] = None
    tenant_id: Optional[str] = None


class PatientAllergyListResponse(AppBaseModel):
    items: List[PatientAllergyRead]
    total: int


# --- Clinical Protocol Schemas ---------------------------------------------


class ClinicalProtocolCreate(AppBaseModel):
    name_tr: str = Field(..., max_length=500)
    name_en: Optional[str] = Field(None, max_length=500)
    icd_codes: Optional[List[str]] = None
    specialty: Optional[str] = Field(None, max_length=100)
    protocol_type: ProtocolTypeEnum = ProtocolTypeEnum.treatment
    description: Optional[str] = None
    steps: Optional[List[dict]] = None
    contraindications: Optional[List[str]] = None
    evidence_level: Optional[str] = Field(None, max_length=10)
    is_active: bool = True
    version: int = 1


class ClinicalProtocolUpdate(AppBaseModel):
    name_tr: Optional[str] = Field(None, max_length=500)
    name_en: Optional[str] = Field(None, max_length=500)
    icd_codes: Optional[List[str]] = None
    specialty: Optional[str] = Field(None, max_length=100)
    protocol_type: Optional[ProtocolTypeEnum] = None
    description: Optional[str] = None
    steps: Optional[List[dict]] = None
    contraindications: Optional[List[str]] = None
    evidence_level: Optional[str] = Field(None, max_length=10)
    is_active: Optional[bool] = None
    version: Optional[int] = None


class ClinicalProtocolRead(AppBaseModel, IDMixin, TimestampMixin):
    name_tr: str
    name_en: Optional[str] = None
    icd_codes: Optional[List[str]] = None
    specialty: Optional[str] = None
    protocol_type: str
    description: Optional[str] = None
    steps: Optional[List[dict]] = None
    contraindications: Optional[Any] = None
    evidence_level: Optional[str] = None
    is_active: bool = True
    version: int = 1


class ClinicalProtocolListResponse(AppBaseModel):
    items: List[ClinicalProtocolRead]
    total: int


# --- CDSS Check Request / Response Schemas ---------------------------------


class MedicationItem(AppBaseModel):
    """A single medication in a prescription check request."""
    medication_id: Optional[str] = None
    medication_name: str = Field(..., max_length=300)
    atc_code: Optional[str] = Field(None, max_length=20)
    dose: Optional[float] = None
    dose_unit: Optional[str] = Field(None, max_length=20)
    frequency: Optional[str] = Field(None, max_length=50)
    route: Optional[str] = Field(None, max_length=30)


class PrescriptionCheckRequest(AppBaseModel):
    """Request body for checking a prescription through CDSS."""
    patient_id: str = Field(..., max_length=50)
    encounter_id: Optional[str] = Field(None, max_length=50)
    medications: List[MedicationItem] = Field(..., min_length=1)
    diagnosis_codes: Optional[List[str]] = None


class CDSSAlertItem(AppBaseModel):
    """A single alert generated by the CDSS engine."""
    alert_type: str
    severity: str
    title: str
    message: str
    details: Optional[Any] = None


class PrescriptionCheckResponse(AppBaseModel):
    """Response from CDSS prescription check."""
    patient_id: str
    alerts: List[CDSSAlertItem]
    alert_count: int
    has_critical: bool
    can_proceed: bool


class LabResultCheckRequest(AppBaseModel):
    """Request body for checking a lab result through CDSS."""
    patient_id: str = Field(..., max_length=50)
    encounter_id: Optional[str] = Field(None, max_length=50)
    test_code: str = Field(..., max_length=50)
    test_name: str = Field(..., max_length=300)
    value: float
    unit: str = Field(..., max_length=30)
    reference_min: Optional[float] = None
    reference_max: Optional[float] = None


class LabResultCheckResponse(AppBaseModel):
    """Response from CDSS lab result check."""
    patient_id: str
    test_code: str
    is_critical: bool
    alerts: List[CDSSAlertItem]


class DuplicateOrderCheckRequest(AppBaseModel):
    """Request body for duplicate order check."""
    patient_id: str = Field(..., max_length=50)
    order_type: str = Field(..., max_length=30, description="lab | imaging | prescription")
    item_codes: List[str] = Field(..., min_length=1)
    hours_lookback: int = Field(24, ge=1, le=168, description="Hours to look back for duplicates")


class DuplicateOrderCheckResponse(AppBaseModel):
    """Response from duplicate order check."""
    patient_id: str
    duplicates_found: bool
    alerts: List[CDSSAlertItem]


# --- AI CDSS Schemas --------------------------------------------------------


class PatientParams(AppBaseModel):
    """Patient parameters for AI dose calculation."""
    age: int = Field(..., ge=0, le=150, description="Patient age in years")
    weight_kg: float = Field(..., gt=0, le=500, description="Weight in kg")
    height_cm: Optional[float] = Field(None, gt=0, le=300, description="Height in cm")
    gender: Optional[str] = Field(None, max_length=10, description="male/female")
    creatinine: Optional[float] = Field(None, ge=0, description="Serum creatinine mg/dL")
    gfr: Optional[float] = Field(None, ge=0, description="GFR mL/min")
    liver_function: str = Field(
        "normal", description="normal / mild / moderate / severe"
    )
    known_allergies: Optional[List[str]] = Field(None, description="List of known drug allergies")


class SafeDoseRequest(AppBaseModel):
    """Request for AI safe dose calculation."""
    drug: str = Field(..., max_length=200, description="Drug name (English or Turkish)")
    patient: PatientParams


class SafeDoseResponse(AppBaseModel):
    """Response from AI safe dose calculation."""
    drug: str
    found: bool
    recommended_dose: Optional[float] = None
    max_dose: Optional[float] = None
    unit: str = "mg"
    frequency: Optional[str] = None
    adjustment_reason: List[str] = []
    warnings: List[str] = []


class AllergyCheckRequest(AppBaseModel):
    """Request for allergy cross-reactivity check."""
    known_allergies: List[str] = Field(..., min_length=1, description="Known drug allergies")
    new_drug: str = Field(..., max_length=200, description="Drug to check")


class AllergyCheckResponse(AppBaseModel):
    """Response from allergy cross-reactivity check."""
    cross_reactivity_risk: float = Field(..., ge=0, le=1)
    related_allergens: List[str]
    recommendation: str


class SafetyScoreRequest(AppBaseModel):
    """Request for prescription safety scoring."""
    medications: List[dict] = Field(..., min_length=1, description="List of medications with 'name' key")
    patient: PatientParams


class SafetyScoreResponse(AppBaseModel):
    """Response from prescription safety scoring."""
    safety_score: int = Field(..., ge=0, le=100)
    risk_factors: List[str]
    suggestions: List[str]


class AlternativesRequest(AppBaseModel):
    """Request for drug alternative suggestions."""
    drug: str = Field(..., max_length=200)
    reason: str = Field(..., max_length=200, description="Reason: allergy, renal, hepatic, etc.")
    patient: PatientParams


class AlternativeItem(AppBaseModel):
    """A single drug alternative."""
    drug_name: str
    drug_name_tr: str
    drug_class: str
    reason_tr: str
    suitability_score: int
    notes_tr: str = ""


class AlternativesResponse(AppBaseModel):
    """Response from drug alternatives suggestion."""
    alternatives: List[AlternativeItem]
