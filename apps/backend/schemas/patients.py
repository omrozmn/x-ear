from typing import Optional, List, Dict, Any, Union
from enum import Enum
from datetime import date, datetime
from pydantic import Field, EmailStr
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

class PatientRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading patient data - matches Patient.to_dict() output"""
    # Identity
    tc_number: Optional[str] = Field(None, alias="tcNumber")
    identity_number: Optional[str] = Field(None, alias="identityNumber")
    
    # Personal info
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")
    full_name: Optional[str] = Field(None, alias="fullName")
    phone: Optional[str] = None
    email: Optional[str] = None
    birth_date: Optional[str] = Field(None, alias="birthDate")
    dob: Optional[str] = None
    gender: Optional[str] = None
    
    # Address
    address: Optional[Dict[str, Any]] = None
    address_city: Optional[str] = Field(None, alias="addressCity")
    address_district: Optional[str] = Field(None, alias="addressDistrict")
    address_full: Optional[str] = Field(None, alias="addressFull")
    
    # CRM
    status: Optional[str] = None
    segment: Optional[str] = None
    acquisition_type: Optional[str] = Field(None, alias="acquisitionType")
    conversion_step: Optional[str] = Field(None, alias="conversionStep")
    referred_by: Optional[str] = Field(None, alias="referredBy")
    priority_score: Optional[int] = Field(None, alias="priorityScore")
    
    # Relations
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    branch_id: Optional[str] = Field(None, alias="branchId")
    branch_name: Optional[str] = Field(None, alias="branchName")
    
    # JSON Data
    tags: Optional[Any] = None  # Can be list or dict depending on data
    sgk_info: Optional[Dict[str, Any]] = Field(None, alias="sgkInfo")

# --- Search/Filter Schemas ---
class PatientSearchFilters(AppBaseModel):
    q: Optional[str] = None
    status: Optional[PatientStatus] = None
    segment: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    branch_id: Optional[str] = Field(None, alias="branchId")
