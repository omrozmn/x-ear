from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime
from pydantic import Field, field_validator
from .base import AppBaseModel, IDMixin, TimestampMixin

# Enums
class CampaignType(str, Enum):
    SMS = 'sms'
    EMAIL = 'email'
    NOTIFICATION = 'notification'

class CampaignStatus(str, Enum):
    DRAFT = 'draft'
    SCHEDULED = 'scheduled'
    SENDING = 'sending'
    SENT = 'sent'
    CANCELLED = 'cancelled'

class TargetSegment(str, Enum):
    ALL = 'all'
    FILTER = 'filter'
    EXCEL = 'excel'

# --- Campaign Schemas ---
class CampaignBase(AppBaseModel):
    name: str
    description: Optional[str] = None
    campaign_type: CampaignType = Field(default=CampaignType.SMS, alias="campaignType")
    target_segment: TargetSegment = Field(..., alias="targetSegment")
    target_criteria: Optional[Dict[str, Any]] = Field(default={}, alias="targetCriteria")
    message_template: str = Field(..., alias="messageTemplate")
    subject: Optional[str] = None
    scheduled_at: Optional[datetime] = Field(None, alias="scheduledAt")

class CampaignCreate(CampaignBase):
    pass

class CampaignUpdate(AppBaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    target_segment: Optional[TargetSegment] = Field(None, alias="targetSegment")
    target_criteria: Optional[Dict[str, Any]] = Field(None, alias="targetCriteria")
    message_template: Optional[str] = Field(None, alias="messageTemplate")
    subject: Optional[str] = None
    scheduled_at: Optional[datetime] = Field(None, alias="scheduledAt")
    status: Optional[CampaignStatus] = None

class CampaignRead(CampaignBase, IDMixin, TimestampMixin):
    tenant_id: str = Field(..., alias="tenantId")
    status: CampaignStatus = CampaignStatus.DRAFT
    sent_at: Optional[datetime] = Field(None, alias="sentAt")
    
    # Stats
    total_recipients: int = Field(0, alias="totalRecipients")
    successful_sends: int = Field(0, alias="successfulSends")
    failed_sends: int = Field(0, alias="failedSends")
    
    # Cost
    estimated_cost: float = Field(0.0, alias="estimatedCost")
    actual_cost: float = Field(0.0, alias="actualCost")

class CampaignSendRequest(AppBaseModel):
    """Specific request model for triggering campaign send/preview"""
    sender_id: Optional[str] = Field(None, alias="senderId")
    is_preview: bool = Field(False, alias="isPreview")
    preview_phone: Optional[str] = Field(None, alias="previewPhone")

# --- SMS Log (Campaign Result) Schemas ---
class SMSLogStatus(str, Enum):
    PENDING = 'pending'
    SENT = 'sent'
    DELIVERED = 'delivered'
    FAILED = 'failed'

class SMSLogRead(IDMixin, TimestampMixin):
    campaign_id: Optional[str] = Field(None, alias="campaignId")
    patient_id: Optional[str] = Field(None, alias="patientId")
    phone_number: str = Field(..., alias="phoneNumber")
    message: str
    status: SMSLogStatus
    
    sent_at: Optional[datetime] = Field(None, alias="sentAt")
    delivered_at: Optional[datetime] = Field(None, alias="deliveredAt")
    
    error_message: Optional[str] = Field(None, alias="errorMessage")
    cost: Optional[float] = 0.0
