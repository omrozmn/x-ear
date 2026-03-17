"""
Pydantic v2 schemas for the Emergency Service (MS-7).
"""
from datetime import datetime
from enum import Enum
from typing import Optional, List

from pydantic import Field, field_validator
from hbys_common.schemas import AppBaseModel


# --- Enums --------------------------------------------------------------------


class ArrivalModeEnum(str, Enum):
    walk_in = "walk_in"
    ambulance_112 = "ambulance_112"
    referral = "referral"
    police = "police"
    self_ = "self"


class TriageColorEnum(str, Enum):
    red = "red"
    orange = "orange"
    yellow = "yellow"
    green = "green"
    blue = "blue"


class VisitStatusEnum(str, Enum):
    waiting = "waiting"
    triage = "triage"
    treatment = "treatment"
    observation = "observation"
    admitted = "admitted"
    discharged = "discharged"
    transferred = "transferred"
    deceased = "deceased"
    left_ama = "left_ama"


class ConsciousnessEnum(str, Enum):
    alert = "alert"
    verbal = "verbal"
    pain = "pain"
    unresponsive = "unresponsive"


# --- Emergency Visit Schemas --------------------------------------------------


class EmergencyVisitBase(AppBaseModel):
    patient_id: Optional[str] = Field(None, max_length=36, description="Null for unidentified patients")
    arrival_mode: ArrivalModeEnum = Field(ArrivalModeEnum.walk_in)
    arrival_date: Optional[datetime] = None
    unidentified_patient_info: Optional[str] = Field(None, description="JSON string for unidentified patient details")
    chief_complaint: Optional[str] = Field(None, max_length=500)
    is_forensic_case: bool = Field(False)
    is_workplace_accident: bool = Field(False)
    is_traffic_accident: bool = Field(False)


class EmergencyVisitCreate(EmergencyVisitBase):
    """Create a new emergency visit registration."""
    pass


class EmergencyVisitUpdate(AppBaseModel):
    """Update an emergency visit. All fields optional."""
    patient_id: Optional[str] = Field(None, max_length=36)
    chief_complaint: Optional[str] = Field(None, max_length=500)
    unidentified_patient_info: Optional[str] = None
    is_forensic_case: Optional[bool] = None
    forensic_report_filed: Optional[bool] = None
    is_workplace_accident: Optional[bool] = None
    is_traffic_accident: Optional[bool] = None


class EmergencyVisitRead(EmergencyVisitBase):
    id: str
    triage_level: Optional[int] = None
    triage_color: Optional[str] = None
    triage_nurse_id: Optional[str] = None
    triage_date: Optional[datetime] = None
    attending_doctor_id: Optional[str] = None
    status: VisitStatusEnum = VisitStatusEnum.waiting
    bed_number: Optional[str] = None
    observation_start: Optional[datetime] = None
    disposition: Optional[str] = None
    discharge_date: Optional[datetime] = None
    discharge_notes: Optional[str] = None
    forensic_report_filed: bool = False
    tenant_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# --- Triage Schemas -----------------------------------------------------------


class TriageAssessmentBase(AppBaseModel):
    pain_score: Optional[int] = Field(None, ge=0, le=10)
    consciousness: Optional[ConsciousnessEnum] = None

    glasgow_eye: Optional[int] = Field(None, ge=1, le=4)
    glasgow_verbal: Optional[int] = Field(None, ge=1, le=5)
    glasgow_motor: Optional[int] = Field(None, ge=1, le=6)

    blood_pressure_systolic: Optional[int] = Field(None, ge=0, le=400)
    blood_pressure_diastolic: Optional[int] = Field(None, ge=0, le=300)
    heart_rate: Optional[int] = Field(None, ge=0, le=400)
    respiratory_rate: Optional[int] = Field(None, ge=0, le=100)
    temperature: Optional[float] = Field(None, ge=20.0, le=50.0)
    oxygen_saturation: Optional[float] = Field(None, ge=0.0, le=100.0)

    blood_glucose: Optional[float] = Field(None, ge=0.0)
    allergies: Optional[str] = None
    current_medications: Optional[str] = None


class TriageAssessmentCreate(TriageAssessmentBase):
    """Create a triage assessment for an emergency visit."""
    assessed_by: Optional[str] = Field(None, max_length=36)

    @field_validator("glasgow_eye", "glasgow_verbal", "glasgow_motor", mode="before")
    @classmethod
    def validate_glasgow_components(cls, v):
        if v is not None and not isinstance(v, int):
            raise ValueError("Glasgow component must be an integer")
        return v


class TriageAssessmentRead(TriageAssessmentBase):
    id: str
    emergency_visit_id: str
    glasgow_score: Optional[int] = None
    assessed_by: Optional[str] = None
    assessed_at: Optional[datetime] = None
    tenant_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# --- Action Schemas -----------------------------------------------------------


class AssignDoctorRequest(AppBaseModel):
    attending_doctor_id: str = Field(..., max_length=36)


class AssignBedRequest(AppBaseModel):
    bed_number: str = Field(..., max_length=20)


class DischargeRequest(AppBaseModel):
    disposition: str = Field(..., max_length=100, description="e.g. discharged_home, admitted, transferred")
    discharge_notes: Optional[str] = None


class AdmitRequest(AppBaseModel):
    """Admit patient from emergency to inpatient."""
    disposition: str = Field("admitted", max_length=100)
    notes: Optional[str] = None


class TransferRequest(AppBaseModel):
    """Transfer patient to another facility."""
    destination: str = Field(..., max_length=200, description="Target facility or department")
    transfer_reason: Optional[str] = None


class ForensicReportRequest(AppBaseModel):
    """File a forensic report for an emergency visit."""
    report_notes: Optional[str] = None


# --- Dashboard / List Schemas -------------------------------------------------


class DashboardStats(AppBaseModel):
    total_active: int = 0
    waiting: int = 0
    in_triage: int = 0
    in_treatment: int = 0
    in_observation: int = 0
    red_triage: int = 0
    orange_triage: int = 0
    yellow_triage: int = 0
    green_triage: int = 0
    blue_triage: int = 0
    forensic_cases: int = 0
    beds_occupied: int = 0
    avg_wait_minutes: Optional[float] = None


class EmergencyVisitListResponse(AppBaseModel):
    items: List[EmergencyVisitRead]
    total: int
