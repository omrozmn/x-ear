from typing import Optional, List
from datetime import datetime, date
from pydantic import Field, field_validator, ValidationInfo
from .base import AppBaseModel, IDMixin, TimestampMixin
from .enums import AppointmentStatus, AppointmentType

# --- Appointment Schemas ---
class AppointmentBase(AppBaseModel):
    party_id: str = Field(..., alias="partyId")
    clinician_id: Optional[str] = Field(None, alias="clinicianId")
    branch_id: Optional[str] = Field(None, alias="branchId")
    
    date: datetime
    time: str = Field(..., pattern=r"^\d{2}:\d{2}$") # HH:MM format
    duration: int = 30 # minutes
    
    appointment_type: AppointmentType = Field(default=AppointmentType.CONSULTATION, alias="appointmentType")
    status: AppointmentStatus = AppointmentStatus.SCHEDULED
    notes: Optional[str] = None
    
    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v):
        if isinstance(v, str):
            return v.lower()
        if hasattr(v, 'value'): # Handle Enum from core
            return str(v.value).lower()
        return v

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
    branch_id: Optional[str] = Field(None, alias="branchId")

class RescheduleRequest(AppBaseModel):
    date: str
    time: str

class AppointmentAvailability(AppBaseModel):
    available_slots: List[str] = Field(..., alias="availableSlots")
    occupied_slots: List[str] = Field(..., alias="occupiedSlots")
    date: str

class AppointmentRead(AppointmentBase, IDMixin):
    tenant_id: str = Field(..., alias="tenantId")
    party_name: Optional[str] = Field(None, alias="partyName")
    tenant_name: Optional[str] = Field(None, alias="tenantName")  # For admin views
    
    # Legacy alias support if needed
    type: Optional[AppointmentType] = None
    
    @field_validator("type", mode="before")
    @classmethod
    def set_type_alias(cls, v, info: ValidationInfo):
        if v: return v
        return info.data.get("appointment_type")
