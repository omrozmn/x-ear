"""
Prescription Schemas (Pydantic v2)
==================================
Full CRUD schemas for prescriptions, prescription items, medications,
and MEDULA e-Recete request/response structures.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import Field

from schemas.base import AppBaseModel, IDMixin, TimestampMixin, ResponseEnvelope


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class PrescriptionType(str, Enum):
    normal = "normal"
    red = "red"
    green = "green"
    orange = "orange"
    purple = "purple"


class PrescriptionStatus(str, Enum):
    draft = "draft"
    sent = "sent"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"


class DosageForm(str, Enum):
    tablet = "tablet"
    capsule = "capsule"
    syrup = "syrup"
    injection = "injection"
    cream = "cream"
    drop = "drop"
    inhaler = "inhaler"
    patch = "patch"
    suppository = "suppository"


# ---------------------------------------------------------------------------
# Prescription Item Schemas
# ---------------------------------------------------------------------------

class PrescriptionItemBase(AppBaseModel):
    medication_name: str = Field(..., max_length=300)
    medication_code: Optional[str] = Field(None, max_length=50)
    dosage: Optional[str] = Field(None, max_length=100)
    dosage_form: Optional[DosageForm] = DosageForm.tablet
    frequency: Optional[str] = Field(None, max_length=50, description="e.g. 3x1")
    duration_days: Optional[int] = Field(None, ge=1)
    quantity: Optional[int] = Field(None, ge=1)
    usage_instructions: Optional[str] = None
    is_generic_allowed: bool = True
    box_count: Optional[int] = Field(1, ge=1)
    unit_per_box: Optional[int] = Field(None, ge=1)


class PrescriptionItemCreate(PrescriptionItemBase):
    """Create a new item inside a prescription."""
    pass


class PrescriptionItemUpdate(AppBaseModel):
    """Partial update for an existing item."""
    medication_name: Optional[str] = Field(None, max_length=300)
    medication_code: Optional[str] = Field(None, max_length=50)
    dosage: Optional[str] = Field(None, max_length=100)
    dosage_form: Optional[DosageForm] = None
    frequency: Optional[str] = Field(None, max_length=50)
    duration_days: Optional[int] = Field(None, ge=1)
    quantity: Optional[int] = Field(None, ge=1)
    usage_instructions: Optional[str] = None
    is_generic_allowed: Optional[bool] = None
    box_count: Optional[int] = Field(None, ge=1)
    unit_per_box: Optional[int] = Field(None, ge=1)


class PrescriptionItemRead(PrescriptionItemBase, IDMixin, TimestampMixin):
    prescription_id: str


# ---------------------------------------------------------------------------
# Prescription Schemas
# ---------------------------------------------------------------------------

class PrescriptionBase(AppBaseModel):
    encounter_id: Optional[str] = None
    patient_id: str
    doctor_id: str
    prescription_type: PrescriptionType = PrescriptionType.normal
    protocol_no: Optional[str] = None
    diagnosis_codes: Optional[List[str]] = None
    notes: Optional[str] = None
    prescribed_at: Optional[datetime] = None


class PrescriptionCreate(PrescriptionBase):
    """Create a new prescription, optionally with items inline."""
    items: Optional[List[PrescriptionItemCreate]] = None


class PrescriptionUpdate(AppBaseModel):
    """Partial update for an existing prescription (draft only)."""
    encounter_id: Optional[str] = None
    prescription_type: Optional[PrescriptionType] = None
    protocol_no: Optional[str] = None
    diagnosis_codes: Optional[List[str]] = None
    notes: Optional[str] = None
    prescribed_at: Optional[datetime] = None


class PrescriptionRead(PrescriptionBase, IDMixin, TimestampMixin):
    status: PrescriptionStatus
    medula_prescription_id: Optional[str] = None
    medula_response: Optional[dict] = None
    items: List[PrescriptionItemRead] = []


class PrescriptionListItem(AppBaseModel, IDMixin, TimestampMixin):
    """Lightweight representation for list endpoints."""
    patient_id: str
    doctor_id: str
    prescription_type: PrescriptionType
    status: PrescriptionStatus
    medula_prescription_id: Optional[str] = None
    protocol_no: Optional[str] = None
    prescribed_at: Optional[datetime] = None
    item_count: Optional[int] = Field(None, description="Number of items")


# ---------------------------------------------------------------------------
# Medication Schemas
# ---------------------------------------------------------------------------

class MedicationBase(AppBaseModel):
    name: str = Field(..., max_length=300)
    generic_name: Optional[str] = Field(None, max_length=300)
    barcode: Optional[str] = Field(None, max_length=50)
    atc_code: Optional[str] = Field(None, max_length=20)
    form: Optional[DosageForm] = None
    manufacturer: Optional[str] = Field(None, max_length=200)
    is_prescription_required: bool = True
    is_controlled: bool = False
    controlled_type: Optional[str] = None
    unit_price: Optional[float] = None


class MedicationCreate(MedicationBase):
    pass


class MedicationUpdate(AppBaseModel):
    name: Optional[str] = Field(None, max_length=300)
    generic_name: Optional[str] = Field(None, max_length=300)
    barcode: Optional[str] = Field(None, max_length=50)
    atc_code: Optional[str] = Field(None, max_length=20)
    form: Optional[DosageForm] = None
    manufacturer: Optional[str] = Field(None, max_length=200)
    is_prescription_required: Optional[bool] = None
    is_controlled: Optional[bool] = None
    controlled_type: Optional[str] = None
    unit_price: Optional[float] = None


class MedicationRead(MedicationBase, IDMixin, TimestampMixin):
    pass


# ---------------------------------------------------------------------------
# MEDULA e-Recete Schemas
# ---------------------------------------------------------------------------

class MedulaDiagnosis(AppBaseModel):
    """ICD-10 diagnosis entry for MEDULA."""
    code: str = Field(..., description="ICD-10 code")
    name: Optional[str] = None
    is_primary: bool = False


class MedulaMedicationItem(AppBaseModel):
    """Single medication in a MEDULA request."""
    medication_code: str
    medication_name: str
    dosage: Optional[str] = None
    dosage_form: Optional[str] = None
    frequency: Optional[str] = None
    duration_days: Optional[int] = None
    quantity: Optional[int] = None
    box_count: Optional[int] = 1
    usage_instructions: Optional[str] = None
    is_generic_allowed: bool = True


class MedulaSendRequest(AppBaseModel):
    """Request payload to send prescription to MEDULA."""
    prescription_id: str
    facility_code: Optional[str] = Field(None, description="Tesis kodu")
    doctor_tc: Optional[str] = Field(None, description="Doctor TC Kimlik No")
    patient_tc: Optional[str] = Field(None, description="Patient TC Kimlik No")


class MedulaSendResponse(AppBaseModel):
    """Response from MEDULA e-Recete service."""
    success: bool
    medula_prescription_id: Optional[str] = None
    sonuc_kodu: Optional[str] = Field(None, description="MEDULA sonuc kodu")
    sonuc_mesaji: Optional[str] = Field(None, description="MEDULA sonuc mesaji")
    raw_response: Optional[dict] = None


class MedulaCancelRequest(AppBaseModel):
    """Request payload to cancel a prescription on MEDULA."""
    prescription_id: str
    cancel_reason: Optional[str] = None


class MedulaCancelResponse(AppBaseModel):
    """Response from MEDULA cancellation."""
    success: bool
    message: Optional[str] = None
    raw_response: Optional[dict] = None


# ---------------------------------------------------------------------------
# Response Envelopes
# ---------------------------------------------------------------------------

class PrescriptionResponse(ResponseEnvelope[PrescriptionRead]):
    pass


class PrescriptionListResponse(ResponseEnvelope[List[PrescriptionListItem]]):
    pass


class PrescriptionItemResponse(ResponseEnvelope[PrescriptionItemRead]):
    pass


class MedicationResponse(ResponseEnvelope[MedicationRead]):
    pass


class MedicationListResponse(ResponseEnvelope[List[MedicationRead]]):
    pass


class MedulaSendResponseEnvelope(ResponseEnvelope[MedulaSendResponse]):
    pass


class MedulaCancelResponseEnvelope(ResponseEnvelope[MedulaCancelResponse]):
    pass
