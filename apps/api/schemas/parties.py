from typing import Optional, List, Dict, Any, Union
from enum import Enum
from datetime import date, datetime
from pydantic import Field, EmailStr
from .base import AppBaseModel, IDMixin, TimestampMixin

# Enums
class PartyStatus(str, Enum):
    ACTIVE = 'active'
    INACTIVE = 'inactive'
    LEAD = 'lead'
    TRIAL = 'trial'
    CUSTOMER = 'customer'
    NEW = 'new'
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

# --- Party Schemas ---
# Aliased to PartyBase for internal consistency, but kept Party naming for models
class PartyBase(AppBaseModel):
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
    status: PartyStatus = PartyStatus.ACTIVE
    segment: str = "lead"
    acquisition_type: str = Field("walk-in", alias="acquisitionType")
    conversion_step: Optional[str] = Field(None, alias="conversionStep")
    referred_by: Optional[str] = Field(None, alias="referredBy")
    priority_score: int = Field(0, alias="priorityScore")
    
    # JSON Data
    tags: List[str] = []
    sgk_info: Dict[str, Any] = Field(default={}, alias="sgkInfo")
    
    branch_id: Optional[str] = Field(None, alias="branchId")

class PartyCreate(PartyBase):
    pass

class PartyUpdate(AppBaseModel):
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    status: Optional[PartyStatus] = None
    # CRM fields
    segment: Optional[str] = None
    acquisition_type: Optional[str] = Field(None, alias="acquisitionType")
    branch_id: Optional[str] = Field(None, alias="branchId")
    tags: Optional[List[str]] = None
    # Address fields
    address_city: Optional[str] = Field(None, alias="addressCity")
    address_district: Optional[str] = Field(None, alias="addressDistrict")
    address_full: Optional[str] = Field(None, alias="addressFull")
    
    # JSON Data
    sgk_info: Optional[Dict[str, Any]] = Field(None, alias="sgkInfo")

class PartyRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading party data - matches Party.to_dict() output"""
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
    tags: Optional[Any] = Field(None, validation_alias="tags_json")
    sgk_info: Optional[Dict[str, Any]] = Field(None, alias="sgkInfo", validation_alias="sgk_info_json")

    # Remediation 5.1: Roles
    # Using alias="code" for role_code to match legacy output
    roles: Optional[List["PartyRoleRead"]] = None

    # Remediation 5.2: Hearing Profile
    hearing_profile: Optional["HearingProfileRead"] = Field(None, alias="hearingProfile")

# --- Nested Schemas ---
class PartyRoleRead(AppBaseModel):
    code: str = Field(..., alias="code", validation_alias="role_code")
    assigned_at: Optional[datetime] = Field(None, alias="assignedAt")

class HearingProfileRead(AppBaseModel, IDMixin, TimestampMixin):
    party_id: str = Field(..., alias="partyId")
    sgk_info: Optional[Dict[str, Any]] = Field(None, alias="sgkInfo", validation_alias="sgk_info_json")

# --- Search/Filter Schemas ---
class PartySearchFilters(AppBaseModel):
    q: Optional[str] = None
    status: Optional[PartyStatus] = None
    segment: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    branch_id: Optional[str] = Field(None, alias="branchId")

class BulkUploadResponse(AppBaseModel):
    success: bool
    created: int
    updated: int
    errors: List[Dict[str, Any]]

# Update forward refs
PartyRead.model_rebuild()

