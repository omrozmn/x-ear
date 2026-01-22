from typing import Optional, List, Any
from enum import Enum
from pydantic import Field, EmailStr, field_validator
from .base import AppBaseModel, IDMixin, TimestampMixin

# Enums
# Enums
class SmsHeaderType(str, Enum):
    COMPANY_TITLE = 'company_title'
    TRADEMARK = 'trademark'
    DOMAIN = 'domain'
    OTHER = 'other'

class SmsHeaderStatus(str, Enum):
    PENDING = 'pending'
    APPROVED = 'approved'
    REJECTED = 'rejected'

class SmsSourceType(str, Enum):
    EXCEL = 'excel'
    FILTER = 'filter'

class DocumentType(str, Enum):
    CONTRACT = 'contract'
    ID_CARD = 'id_card'
    RESIDENCE = 'residence'
    TAX_PLATE = 'tax_plate'
    ACTIVITY_CERT = 'activity_cert'
    SIGNATURE_CIRCULAR = 'signature_circular'

# --- Sms Provider Config Schemas ---
class SmsProviderConfigBase(AppBaseModel):
    documents_email: Optional[EmailStr] = Field(None, alias="documentsEmail")
    api_username: Optional[str] = Field(None, alias="apiUsername")
    is_active: bool = Field(True, alias="isActive")
    documents_submitted: bool = Field(False, alias="documentsSubmitted")
    all_documents_approved: bool = Field(False, alias="allDocumentsApproved")

class SmsProviderConfigCreate(SmsProviderConfigBase):
    tenant_id: str = Field(..., alias="tenantId")
    api_password: Optional[str] = Field(None, alias="apiPassword")

class SmsProviderConfigUpdate(AppBaseModel):
    api_username: Optional[str] = Field(None, alias="apiUsername")
    api_password: Optional[str] = Field(None, alias="apiPassword")
    documents_email: Optional[EmailStr] = Field(None, alias="documentsEmail")
    is_active: Optional[bool] = Field(None, alias="isActive")

class SmsProviderConfigRead(SmsProviderConfigBase, IDMixin):
    tenant_id: str = Field(..., alias="tenantId")
    documents: List[Any] = Field(default_factory=list)
    documents_submitted_at: Optional[str] = Field(None, alias="documentsSubmittedAt")
    # Password explicitly excluded
    
    @field_validator('documents', mode='before')
    @classmethod
    def convert_none_to_list(cls, v):
        return v if v is not None else []

# --- Sms Header Request Schemas ---
class SmsHeaderRequestBase(AppBaseModel):
    header_text: str = Field(..., min_length=3, max_length=11, alias="headerText")
    header_type: SmsHeaderType = Field(..., alias="headerType")
    documents: List[str] = []

class SmsHeaderRequestCreate(SmsHeaderRequestBase):
    pass

class SmsHeaderRequestUpdate(AppBaseModel):
    # Only status usually updated by admin
    status: Optional[SmsHeaderStatus] = None
    rejection_reason: Optional[str] = Field(None, alias="rejectionReason")

class SmsHeaderRequestRead(SmsHeaderRequestBase, IDMixin, TimestampMixin):
    tenant_id: str = Field(..., alias="tenantId")
    status: SmsHeaderStatus = SmsHeaderStatus.PENDING
    rejection_reason: Optional[str] = Field(None, alias="rejectionReason")
    is_default: bool = Field(False, alias="isDefault")

# --- Sms Package Schemas ---
class SmsPackageBase(AppBaseModel):
    name: str
    description: Optional[str] = None
    sms_count: int = Field(..., gt=0, alias="smsCount")
    price: float = Field(..., gt=0)
    currency: str = "TRY"
    is_active: bool = Field(True, alias="isActive")

class SmsPackageCreate(SmsPackageBase):
    pass

class SmsPackageUpdate(AppBaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sms_count: Optional[int] = Field(None, gt=0, alias="smsCount")
    price: Optional[float] = Field(None, gt=0)
    currency: Optional[str] = None
    is_active: Optional[bool] = Field(None, alias="isActive")

class SmsPackageRead(SmsPackageBase, IDMixin, TimestampMixin):
    pass

# --- Tenant Sms Credit Schemas ---
class TenantSmsCreditRead(AppBaseModel, IDMixin):
    tenant_id: str = Field(..., alias="tenantId")
    balance: int = 0
    total_purchased: int = Field(0, alias="totalPurchased")
    total_used: int = Field(0, alias="totalUsed")

# --- Target Audience Schemas ---
class TargetAudienceBase(AppBaseModel):
    name: str
    source_type: SmsSourceType = Field(..., alias="sourceType")
    filter_criteria: Optional[dict] = Field(None, alias="filterCriteria")

class TargetAudienceCreate(TargetAudienceBase):
    file_path: Optional[str] = Field(None, alias="filePath")
    total_records: int = Field(0, alias="totalRecords")

class TargetAudienceRead(TargetAudienceBase, IDMixin, TimestampMixin):
    tenant_id: str = Field(..., alias="tenantId")
    total_records: int = Field(0, alias="totalRecords")
