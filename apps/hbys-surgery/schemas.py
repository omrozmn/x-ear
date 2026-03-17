"""
Pydantic v2 schemas for the Surgery Microservice.
"""
from datetime import datetime
from enum import Enum
from typing import Optional, List, Any

from pydantic import Field

from hbys_common.schemas import AppBaseModel, IDMixin, TimestampMixin


# --- Enums ----------------------------------------------------------------


class SurgeryTypeEnum(str, Enum):
    elective = "elective"
    urgent = "urgent"
    emergency = "emergency"


class SurgeryStatusEnum(str, Enum):
    planned = "planned"
    scheduled = "scheduled"
    pre_op = "pre_op"
    in_progress = "in_progress"
    post_op = "post_op"
    completed = "completed"
    cancelled = "cancelled"


class AnesthesiaTypeEnum(str, Enum):
    general = "general"
    spinal = "spinal"
    epidural = "epidural"
    local = "local"
    sedation = "sedation"
    regional = "regional"


class LateralityEnum(str, Enum):
    left = "left"
    right = "right"
    bilateral = "bilateral"
    not_applicable = "not_applicable"


class TeamRoleEnum(str, Enum):
    primary_surgeon = "primary_surgeon"
    assistant_surgeon = "assistant_surgeon"
    anesthesiologist = "anesthesiologist"
    scrub_nurse = "scrub_nurse"
    circulating_nurse = "circulating_nurse"
    technician = "technician"


class ASAScoreEnum(str, Enum):
    asa_1 = "1"
    asa_2 = "2"
    asa_3 = "3"
    asa_4 = "4"
    asa_5 = "5"
    asa_6 = "6"


# --- Surgery Schemas ------------------------------------------------------


class SurgeryCreate(AppBaseModel):
    encounter_id: str = Field(..., max_length=36)
    patient_id: str = Field(..., max_length=36)
    surgery_type: SurgeryTypeEnum = Field(SurgeryTypeEnum.elective)
    procedure_name: str = Field(..., max_length=500)
    procedure_code: Optional[str] = Field(None, max_length=50, description="SUT kodu")
    body_site: Optional[str] = Field(None, max_length=200)
    laterality: Optional[LateralityEnum] = None
    status: SurgeryStatusEnum = Field(SurgeryStatusEnum.planned)
    scheduled_date: Optional[datetime] = None
    operating_room: Optional[str] = Field(None, max_length=100)
    estimated_duration_minutes: Optional[int] = Field(None, ge=1, le=2880)
    anesthesia_type: Optional[AnesthesiaTypeEnum] = None
    pre_op_diagnosis: Optional[str] = None
    post_op_diagnosis: Optional[str] = None
    surgical_notes: Optional[str] = None


class SurgeryUpdate(AppBaseModel):
    surgery_type: Optional[SurgeryTypeEnum] = None
    procedure_name: Optional[str] = Field(None, max_length=500)
    procedure_code: Optional[str] = Field(None, max_length=50)
    body_site: Optional[str] = Field(None, max_length=200)
    laterality: Optional[LateralityEnum] = None
    status: Optional[SurgeryStatusEnum] = None
    scheduled_date: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    operating_room: Optional[str] = Field(None, max_length=100)
    estimated_duration_minutes: Optional[int] = Field(None, ge=1, le=2880)
    anesthesia_type: Optional[AnesthesiaTypeEnum] = None
    pre_op_diagnosis: Optional[str] = None
    post_op_diagnosis: Optional[str] = None
    surgical_notes: Optional[str] = None
    complications: Optional[str] = None
    blood_loss_ml: Optional[int] = Field(None, ge=0)
    specimens_sent: Optional[bool] = None


class SurgeryRead(AppBaseModel, IDMixin, TimestampMixin):
    encounter_id: str
    patient_id: str
    surgery_type: str
    procedure_name: str
    procedure_code: Optional[str] = None
    body_site: Optional[str] = None
    laterality: Optional[str] = None
    status: str
    scheduled_date: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    operating_room: Optional[str] = None
    estimated_duration_minutes: Optional[int] = None
    anesthesia_type: Optional[str] = None
    pre_op_diagnosis: Optional[str] = None
    post_op_diagnosis: Optional[str] = None
    surgical_notes: Optional[str] = None
    complications: Optional[str] = None
    blood_loss_ml: Optional[int] = None
    specimens_sent: bool = False
    tenant_id: Optional[str] = None


class SurgeryListResponse(AppBaseModel):
    items: List[SurgeryRead]
    total: int


# --- Surgery Team Schemas -------------------------------------------------


class SurgeryTeamCreate(AppBaseModel):
    user_id: str = Field(..., max_length=36)
    role: TeamRoleEnum = Field(...)
    notes: Optional[str] = None


class SurgeryTeamUpdate(AppBaseModel):
    role: Optional[TeamRoleEnum] = None
    notes: Optional[str] = None


class SurgeryTeamRead(AppBaseModel, IDMixin, TimestampMixin):
    surgery_id: str
    user_id: str
    role: str
    notes: Optional[str] = None
    tenant_id: Optional[str] = None


# --- WHO Surgical Safety Checklist Schemas --------------------------------


class SignInData(AppBaseModel):
    patient_identity_confirmed: bool = False
    site_marked: bool = False
    anesthesia_check_complete: bool = False
    pulse_oximeter_on: bool = False
    allergies_checked: bool = False
    airway_risk_assessed: bool = False


class TimeOutData(AppBaseModel):
    team_introduction: bool = False
    patient_procedure_site_confirmed: bool = False
    antibiotic_prophylaxis_given: bool = False
    critical_events_reviewed: bool = False
    imaging_displayed: bool = False


class SignOutData(AppBaseModel):
    procedure_recorded: bool = False
    instrument_count_correct: bool = False
    specimens_labeled: bool = False
    concerns_addressed: bool = False


class ChecklistCreate(AppBaseModel):
    notes: Optional[str] = None


class ChecklistSignInUpdate(SignInData):
    """Update Sign In phase of the checklist."""
    pass


class ChecklistTimeOutUpdate(TimeOutData):
    """Update Time Out phase of the checklist."""
    pass


class ChecklistSignOutUpdate(SignOutData):
    """Update Sign Out phase of the checklist."""
    pass


class SignInRead(AppBaseModel):
    patient_identity_confirmed: bool = False
    site_marked: bool = False
    anesthesia_check_complete: bool = False
    pulse_oximeter_on: bool = False
    allergies_checked: bool = False
    airway_risk_assessed: bool = False
    completed_by: Optional[str] = None
    completed_at: Optional[datetime] = None


class TimeOutRead(AppBaseModel):
    team_introduction: bool = False
    patient_procedure_site_confirmed: bool = False
    antibiotic_prophylaxis_given: bool = False
    critical_events_reviewed: bool = False
    imaging_displayed: bool = False
    completed_by: Optional[str] = None
    completed_at: Optional[datetime] = None


class SignOutRead(AppBaseModel):
    procedure_recorded: bool = False
    instrument_count_correct: bool = False
    specimens_labeled: bool = False
    concerns_addressed: bool = False
    completed_by: Optional[str] = None
    completed_at: Optional[datetime] = None


class ChecklistRead(AppBaseModel, IDMixin, TimestampMixin):
    surgery_id: str
    sign_in: SignInRead
    time_out: TimeOutRead
    sign_out: SignOutRead
    notes: Optional[str] = None
    tenant_id: Optional[str] = None


# --- Anesthesia Record Schemas --------------------------------------------


class AnesthesiaRecordCreate(AppBaseModel):
    anesthesiologist_id: Optional[str] = Field(None, max_length=36)
    asa_score: Optional[ASAScoreEnum] = None
    anesthesia_type: Optional[AnesthesiaTypeEnum] = None
    pre_op_assessment: Optional[str] = None
    medications_given: Optional[Any] = None  # JSON array
    post_op_instructions: Optional[str] = None


class AnesthesiaRecordUpdate(AppBaseModel):
    anesthesiologist_id: Optional[str] = Field(None, max_length=36)
    asa_score: Optional[ASAScoreEnum] = None
    anesthesia_type: Optional[AnesthesiaTypeEnum] = None
    induction_time: Optional[datetime] = None
    intubation_time: Optional[datetime] = None
    extubation_time: Optional[datetime] = None
    recovery_time: Optional[datetime] = None
    pre_op_assessment: Optional[str] = None
    medications_given: Optional[Any] = None
    vital_signs_log: Optional[Any] = None
    complications: Optional[str] = None
    post_op_instructions: Optional[str] = None


class AnesthesiaRecordRead(AppBaseModel, IDMixin, TimestampMixin):
    surgery_id: str
    anesthesiologist_id: Optional[str] = None
    asa_score: Optional[str] = None
    anesthesia_type: Optional[str] = None
    induction_time: Optional[datetime] = None
    intubation_time: Optional[datetime] = None
    extubation_time: Optional[datetime] = None
    recovery_time: Optional[datetime] = None
    pre_op_assessment: Optional[str] = None
    medications_given: Optional[Any] = None
    vital_signs_log: Optional[Any] = None
    complications: Optional[str] = None
    post_op_instructions: Optional[str] = None
    tenant_id: Optional[str] = None


# --- OR Schedule Schema ---------------------------------------------------


class ORScheduleQuery(AppBaseModel):
    operating_room: Optional[str] = Field(None, max_length=100)
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    status: Optional[SurgeryStatusEnum] = None


class ORScheduleEntry(AppBaseModel):
    surgery_id: str
    patient_id: str
    procedure_name: str
    operating_room: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    estimated_duration_minutes: Optional[int] = None
    surgery_type: str
    status: str
    surgeon_name: Optional[str] = None


class ORScheduleResponse(AppBaseModel):
    entries: List[ORScheduleEntry]
    total: int
