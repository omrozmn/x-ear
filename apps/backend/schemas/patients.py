from typing import Optional, List, Dict, Any, Union
from enum import Enum
from datetime import date, datetime
from pydantic import Field, EmailStr, validator
from .base import AppBaseModel, IDMixin, TimestampMixin

# Enums
class PatientStatus(str, Enum):
    ACTIVE = 'active'
    PASSIVE = 'passive'
    DECEASED = 'deceased'
    ARCHIVED = 'archived'

class Gender(str, Enum):
    MALE = 'M'
    FEMALE = 'F'
    OTHER = 'O'

class AddressSchema(AppBaseModel):
    city: Optional[str] = None
    district: Optional[str] = None
    full_address: Optional[str] = Field(None, alias="fullAddress")

# --- Patient Schemas ---
class PatientBase(AppBaseModel):
    first_name: str = Field(..., alias="firstName")
    last_name: str = Field(..., alias="lastName")
    phone: str
    email: Optional[EmailStr] = None
    tc_number: Optional[str] = Field(None, min_length=11, max_length=11, alias="tcNumber")
    identity_number: Optional[str] = Field(None, alias="identityNumber")
    
    # Dates
    birth_date: Optional[Union[date, datetime]] = Field(None, alias="birthDate")
    gender: Optional[Gender] = None
    
    # Address (Flattened or Nested - supporting both for flexibility)
    address: Optional[AddressSchema] = None
    address_city: Optional[str] = Field(None, alias="addressCity")
    address_district: Optional[str] = Field(None, alias="addressDistrict")
    address_full: Optional[str] = Field(None, alias="addressFull")
    
    # CRM
    status: PatientStatus = PatientStatus.ACTIVE
    segment: str = "lead"
    acquisition_type: str = Field("walk-in", alias="acquisitionType")
    conversion_step: Optional[str] = Field(None, alias="conversionStep")
    referred_by: Optional[str] = Field(None, alias="referredBy")
    priority_score: int = Field(0, alias="priorityScore")
    
    # JSON Data
    tags: List[str] = []
    sgk_info: Dict[str, Any] = Field(default={}, alias="sgkInfo")
    
    branch_id: Optional[str] = Field(None, alias="branchId")

class PatientCreate(PatientBase):
    pass

class PatientUpdate(AppBaseModel):
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    status: Optional[PatientStatus] = None
    # ... allow updating other fields optionally
    address_city: Optional[str] = Field(None, alias="addressCity")
    address_district: Optional[str] = Field(None, alias="addressDistrict")
    address_full: Optional[str] = Field(None, alias="addressFull")

class PatientRead(PatientBase, IDMixin, TimestampMixin):
    tenant_id: str = Field(..., alias="tenantId")
    full_name: str = Field(..., alias="fullName")
    branch_name: Optional[str] = Field(None, alias="branchName")

    @validator('full_name', pre=True, always=True)
    def compute_full_name(cls, v, values):
        """Compute full name if not provided (though usually backend does this)"""
        if v: return v
        return f"{values.get('first_name', '')} {values.get('last_name', '')}".strip()

# --- Search/Filter Schemas ---
class PatientSearchFilters(AppBaseModel):
    q: Optional[str] = None
    status: Optional[PatientStatus] = None
    segment: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    branch_id: Optional[str] = Field(None, alias="branchId")
