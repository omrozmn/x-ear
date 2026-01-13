from typing import Optional
from enum import Enum
from datetime import datetime, date
from pydantic import Field, validator
from .base import AppBaseModel, IDMixin, TimestampMixin

# Enums
class AppointmentStatus(str, Enum):
    SCHEDULED = 'scheduled'
    CONFIRMED = 'confirmed'
    COMPLETED = 'completed'
    CANCELLED = 'cancelled'
    NO_SHOW = 'no_show'
    RESCHEDULED = 'rescheduled'

    @classmethod
    def from_legacy(cls, value: str):
        """Map legacy status strings to Enum"""
        mapping = {
            'pending': cls.SCHEDULED,
            'arrived': cls.CONFIRMED,
            'missed': cls.NO_SHOW,
            'deleted': cls.CANCELLED,
        }
        return mapping.get(value.lower(), cls(value.lower()))

class AppointmentType(str, Enum):
    CONSULTATION = 'consultation'
    HEARING_TEST = 'hearing_test'
    DEVICE_TRIAL = 'device_trial'
    DEVICE_FITTING = 'device_fitting'
    CONTROL = 'control'
    REPAIR = 'repair'
    OTHER = 'other'

# --- Appointment Schemas ---
class AppointmentBase(AppBaseModel):
    patient_id: str = Field(..., alias="patientId")
    clinician_id: Optional[str] = Field(None, alias="clinicianId")
    branch_id: Optional[str] = Field(None, alias="branchId")
    
    date: datetime
    time: str = Field(..., pattern=r"^\d{2}:\d{2}$") # HH:MM format
    duration: int = 30 # minutes
    
    appointment_type: AppointmentType = Field(default=AppointmentType.CONSULTATION, alias="appointmentType")
    status: AppointmentStatus = AppointmentStatus.SCHEDULED
    notes: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(AppBaseModel):
    date: Optional[datetime] = None
    time: Optional[str] = None
    duration: Optional[int] = None
    appointment_type: Optional[AppointmentType] = Field(None, alias="appointmentType")
    status: Optional[AppointmentStatus] = None
    notes: Optional[str] = None
    clinician_id: Optional[str] = Field(None, alias="clinicianId")

class AppointmentRead(AppointmentBase, IDMixin):
    tenant_id: str = Field(..., alias="tenantId")
    patient_name: Optional[str] = Field(None, alias="patientName")
    
    # Legacy alias support if needed
    type: Optional[AppointmentType] = None
    
    @validator("type", always=True, pre=True)
    def set_type_alias(cls, v, values):
        if v: return v
        return values.get("appointment_type")
