"""
Pydantic v2 schemas for the Inpatient Microservice (MS-9).
Covers Admissions, Wards, Beds, Nursing Observations, and Nurse Orders.
"""
from datetime import datetime
from enum import Enum
from typing import Optional, List, Any, Dict

from pydantic import Field

from hbys_common.schemas import AppBaseModel, IDMixin, TimestampMixin


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class AdmissionTypeEnum(str, Enum):
    elective = "elective"
    emergency = "emergency"
    transfer = "transfer"
    newborn = "newborn"


class AdmissionStatusEnum(str, Enum):
    admitted = "admitted"
    in_treatment = "in_treatment"
    discharge_planned = "discharge_planned"
    discharged = "discharged"
    transferred = "transferred"
    deceased = "deceased"


class DischargeTypeEnum(str, Enum):
    normal = "normal"
    transfer = "transfer"
    ama = "ama"
    deceased = "deceased"


class WardTypeEnum(str, Enum):
    general = "general"
    icu = "icu"
    nicu = "nicu"
    picu = "picu"
    ccu = "ccu"
    burn = "burn"
    isolation = "isolation"
    maternity = "maternity"
    psychiatric = "psychiatric"


class BedTypeEnum(str, Enum):
    standard = "standard"
    electric = "electric"
    bariatric = "bariatric"
    pediatric = "pediatric"
    icu = "icu"


class BedStatusEnum(str, Enum):
    available = "available"
    occupied = "occupied"
    reserved = "reserved"
    maintenance = "maintenance"
    cleaning = "cleaning"


class ObservationTypeEnum(str, Enum):
    vital_signs = "vital_signs"
    intake_output = "intake_output"
    pain = "pain"
    fall_risk = "fall_risk"
    pressure_ulcer = "pressure_ulcer"
    consciousness = "consciousness"
    general = "general"


class ShiftEnum(str, Enum):
    morning = "morning"
    afternoon = "afternoon"
    night = "night"


class NurseOrderTypeEnum(str, Enum):
    medication = "medication"
    iv_fluid = "iv_fluid"
    monitoring = "monitoring"
    positioning = "positioning"
    wound_care = "wound_care"
    diet = "diet"
    activity = "activity"
    other = "other"


class NurseOrderStatusEnum(str, Enum):
    active = "active"
    completed = "completed"
    cancelled = "cancelled"
    on_hold = "on_hold"


# ---------------------------------------------------------------------------
# Ward Schemas
# ---------------------------------------------------------------------------

class WardCreate(AppBaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    code: str = Field(..., min_length=1, max_length=50)
    ward_type: WardTypeEnum = WardTypeEnum.general
    floor: Optional[str] = Field(None, max_length=20)
    total_beds: int = Field(0, ge=0)
    active_beds: int = Field(0, ge=0)
    head_nurse_id: Optional[str] = Field(None, max_length=36)
    phone_extension: Optional[str] = Field(None, max_length=20)
    is_active: bool = True


class WardUpdate(AppBaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    ward_type: Optional[WardTypeEnum] = None
    floor: Optional[str] = Field(None, max_length=20)
    total_beds: Optional[int] = Field(None, ge=0)
    active_beds: Optional[int] = Field(None, ge=0)
    head_nurse_id: Optional[str] = Field(None, max_length=36)
    phone_extension: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None


class WardRead(AppBaseModel, IDMixin, TimestampMixin):
    name: str
    code: str
    ward_type: str
    floor: Optional[str] = None
    total_beds: int = 0
    active_beds: int = 0
    head_nurse_id: Optional[str] = None
    phone_extension: Optional[str] = None
    is_active: bool = True
    tenant_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Bed Schemas
# ---------------------------------------------------------------------------

class BedCreate(AppBaseModel):
    ward_id: str = Field(..., min_length=1, max_length=36)
    bed_number: str = Field(..., min_length=1, max_length=20)
    room_number: Optional[str] = Field(None, max_length=20)
    bed_type: BedTypeEnum = BedTypeEnum.standard
    status: BedStatusEnum = BedStatusEnum.available
    current_patient_id: Optional[str] = Field(None, max_length=36)
    features: Optional[Dict[str, Any]] = None


class BedUpdate(AppBaseModel):
    bed_number: Optional[str] = Field(None, min_length=1, max_length=20)
    room_number: Optional[str] = Field(None, max_length=20)
    bed_type: Optional[BedTypeEnum] = None
    status: Optional[BedStatusEnum] = None
    current_patient_id: Optional[str] = Field(None, max_length=36)
    features: Optional[Dict[str, Any]] = None


class BedRead(AppBaseModel, IDMixin, TimestampMixin):
    ward_id: str
    bed_number: str
    room_number: Optional[str] = None
    bed_type: str = "standard"
    status: str = "available"
    current_patient_id: Optional[str] = None
    features: Optional[Dict[str, Any]] = None
    tenant_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Admission Schemas
# ---------------------------------------------------------------------------

class AdmissionCreate(AppBaseModel):
    encounter_id: str = Field(..., min_length=1, max_length=36)
    patient_id: str = Field(..., min_length=1, max_length=36)
    admitting_doctor_id: Optional[str] = Field(None, max_length=36)
    attending_doctor_id: Optional[str] = Field(None, max_length=36)
    admission_date: Optional[datetime] = None
    admission_type: AdmissionTypeEnum = AdmissionTypeEnum.elective
    status: AdmissionStatusEnum = AdmissionStatusEnum.admitted
    ward_id: Optional[str] = Field(None, max_length=36)
    bed_id: Optional[str] = Field(None, max_length=36)
    admission_diagnosis: Optional[str] = None
    diet_type: Optional[str] = Field(None, max_length=100)
    activity_level: Optional[str] = Field(None, max_length=100)
    isolation_type: Optional[str] = Field(None, max_length=50)


class AdmissionUpdate(AppBaseModel):
    attending_doctor_id: Optional[str] = Field(None, max_length=36)
    status: Optional[AdmissionStatusEnum] = None
    ward_id: Optional[str] = Field(None, max_length=36)
    bed_id: Optional[str] = Field(None, max_length=36)
    admission_diagnosis: Optional[str] = None
    discharge_diagnosis: Optional[str] = None
    diet_type: Optional[str] = Field(None, max_length=100)
    activity_level: Optional[str] = Field(None, max_length=100)
    isolation_type: Optional[str] = Field(None, max_length=50)


class AdmissionDischarge(AppBaseModel):
    discharge_date: Optional[datetime] = None
    discharge_type: DischargeTypeEnum = DischargeTypeEnum.normal
    discharge_diagnosis: Optional[str] = None
    discharge_summary: Optional[str] = None
    follow_up_instructions: Optional[str] = None


class AdmissionTransfer(AppBaseModel):
    target_ward_id: str = Field(..., min_length=1, max_length=36)
    target_bed_id: Optional[str] = Field(None, max_length=36)
    reason: Optional[str] = None


class AdmissionRead(AppBaseModel, IDMixin, TimestampMixin):
    encounter_id: str
    patient_id: str
    admitting_doctor_id: Optional[str] = None
    attending_doctor_id: Optional[str] = None
    admission_date: Optional[datetime] = None
    discharge_date: Optional[datetime] = None
    admission_type: str = "elective"
    status: str = "admitted"
    ward_id: Optional[str] = None
    bed_id: Optional[str] = None
    admission_diagnosis: Optional[str] = None
    discharge_diagnosis: Optional[str] = None
    discharge_type: Optional[str] = None
    discharge_summary: Optional[str] = None
    follow_up_instructions: Optional[str] = None
    diet_type: Optional[str] = None
    activity_level: Optional[str] = None
    isolation_type: Optional[str] = None
    tenant_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Nursing Observation Schemas
# ---------------------------------------------------------------------------

class NursingObservationCreate(AppBaseModel):
    admission_id: str = Field(..., min_length=1, max_length=36)
    patient_id: str = Field(..., min_length=1, max_length=36)
    observation_type: ObservationTypeEnum = ObservationTypeEnum.general
    nurse_id: Optional[str] = Field(None, max_length=36)
    observed_at: Optional[datetime] = None
    vital_data: Optional[Dict[str, Any]] = None
    intake_ml: Optional[float] = Field(None, ge=0)
    output_ml: Optional[float] = Field(None, ge=0)
    pain_score: Optional[int] = Field(None, ge=0, le=10)
    fall_risk_score: Optional[int] = Field(None, ge=0, le=125)  # Morse scale 0-125
    braden_score: Optional[int] = Field(None, ge=6, le=23)  # Braden scale 6-23
    glasgow_score: Optional[int] = Field(None, ge=3, le=15)  # GCS 3-15
    notes: Optional[str] = None
    shift: Optional[ShiftEnum] = None


class NursingObservationUpdate(AppBaseModel):
    observation_type: Optional[ObservationTypeEnum] = None
    nurse_id: Optional[str] = Field(None, max_length=36)
    observed_at: Optional[datetime] = None
    vital_data: Optional[Dict[str, Any]] = None
    intake_ml: Optional[float] = Field(None, ge=0)
    output_ml: Optional[float] = Field(None, ge=0)
    pain_score: Optional[int] = Field(None, ge=0, le=10)
    fall_risk_score: Optional[int] = Field(None, ge=0, le=125)
    braden_score: Optional[int] = Field(None, ge=6, le=23)
    glasgow_score: Optional[int] = Field(None, ge=3, le=15)
    notes: Optional[str] = None
    shift: Optional[ShiftEnum] = None


class NursingObservationRead(AppBaseModel, IDMixin, TimestampMixin):
    admission_id: str
    patient_id: str
    observation_type: str = "general"
    nurse_id: Optional[str] = None
    observed_at: Optional[datetime] = None
    vital_data: Optional[Dict[str, Any]] = None
    intake_ml: Optional[float] = None
    output_ml: Optional[float] = None
    pain_score: Optional[int] = None
    fall_risk_score: Optional[int] = None
    braden_score: Optional[int] = None
    glasgow_score: Optional[int] = None
    notes: Optional[str] = None
    shift: Optional[str] = None
    tenant_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Nurse Order Schemas
# ---------------------------------------------------------------------------

class NurseOrderCreate(AppBaseModel):
    admission_id: str = Field(..., min_length=1, max_length=36)
    patient_id: str = Field(..., min_length=1, max_length=36)
    order_type: NurseOrderTypeEnum = NurseOrderTypeEnum.other
    description: str = Field(..., min_length=1)
    frequency: Optional[str] = Field(None, max_length=100)
    scheduled_times: Optional[List[str]] = None
    status: NurseOrderStatusEnum = NurseOrderStatusEnum.active
    ordered_by: Optional[str] = Field(None, max_length=36)
    notes: Optional[str] = None


class NurseOrderUpdate(AppBaseModel):
    order_type: Optional[NurseOrderTypeEnum] = None
    description: Optional[str] = Field(None, min_length=1)
    frequency: Optional[str] = Field(None, max_length=100)
    scheduled_times: Optional[List[str]] = None
    status: Optional[NurseOrderStatusEnum] = None
    notes: Optional[str] = None


class NurseOrderExecute(AppBaseModel):
    executed_by: str = Field(..., min_length=1, max_length=36)
    executed_at: Optional[datetime] = None
    notes: Optional[str] = None


class NurseOrderRead(AppBaseModel, IDMixin, TimestampMixin):
    admission_id: str
    patient_id: str
    order_type: str = "other"
    description: str
    frequency: Optional[str] = None
    scheduled_times: Optional[List[str]] = None
    status: str = "active"
    ordered_by: Optional[str] = None
    executed_by: Optional[str] = None
    executed_at: Optional[datetime] = None
    notes: Optional[str] = None
    tenant_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Composite / Dashboard Schemas
# ---------------------------------------------------------------------------

class IOBalanceResponse(AppBaseModel):
    admission_id: str
    patient_id: str
    total_intake_ml: float = 0.0
    total_output_ml: float = 0.0
    balance_ml: float = 0.0
    observations: List[NursingObservationRead] = []


class WardOccupancySummary(AppBaseModel):
    ward_id: str
    ward_name: str
    total_beds: int = 0
    occupied_beds: int = 0
    available_beds: int = 0
    occupancy_rate: float = 0.0


class InpatientDashboard(AppBaseModel):
    total_admissions: int = 0
    active_admissions: int = 0
    discharged_today: int = 0
    admitted_today: int = 0
    ward_occupancy: List[WardOccupancySummary] = []


class AdmissionListResponse(AppBaseModel):
    items: List[AdmissionRead]
    total: int


class WardListResponse(AppBaseModel):
    items: List[WardRead]
    total: int


class BedListResponse(AppBaseModel):
    items: List[BedRead]
    total: int


class NursingObservationListResponse(AppBaseModel):
    items: List[NursingObservationRead]
    total: int


class NurseOrderListResponse(AppBaseModel):
    items: List[NurseOrderRead]
    total: int
