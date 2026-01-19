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
    ACTIVE = 'active'
    INACTIVE = 'inactive'

class TargetSegment(str, Enum):
    ALL = 'all'
    FILTER = 'filter'
    EXCEL = 'excel'

class DiscountType(str, Enum):
    PERCENTAGE = 'PERCENTAGE'
    FIXED_AMOUNT = 'FIXED_AMOUNT'

class TargetAudience(str, Enum):
    ALL = 'ALL'
    NEW_USERS = 'NEW_USERS'
    PREMIUM_USERS = 'PREMIUM_USERS'

# --- Campaign Schemas ---
class CampaignBase(AppBaseModel):
    name: str
    description: Optional[str] = None
    campaign_type: Optional[CampaignType] = Field(default=CampaignType.SMS, alias="campaignType")
    target_segment: Optional[TargetSegment] = Field(default=TargetSegment.ALL, alias="targetSegment")
    target_criteria: Optional[Dict[str, Any]] = Field(default={}, alias="targetCriteria")
    message_template: Optional[str] = Field(default="Default message", alias="messageTemplate")
    subject: Optional[str] = None
    scheduled_at: Optional[datetime] = Field(None, alias="scheduledAt")
    # Admin panel fields
    discount_type: Optional[DiscountType] = Field(default=DiscountType.PERCENTAGE, alias="discountType")
    discount_value: Optional[float] = Field(default=0, alias="discountValue")
    start_date: Optional[datetime] = Field(None, alias="startDate")
    end_date: Optional[datetime] = Field(None, alias="endDate")
    is_active: Optional[bool] = Field(default=True, alias="isActive")
    target_audience: Optional[TargetAudience] = Field(default=TargetAudience.ALL, alias="targetAudience")

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
    # Admin panel fields
    discount_type: Optional[DiscountType] = Field(None, alias="discountType")
    discount_value: Optional[float] = Field(None, alias="discountValue")
    start_date: Optional[datetime] = Field(None, alias="startDate")
    end_date: Optional[datetime] = Field(None, alias="endDate")
    is_active: Optional[bool] = Field(None, alias="isActive")
    target_audience: Optional[TargetAudience] = Field(None, alias="targetAudience")

class CampaignRead(IDMixin, TimestampMixin, AppBaseModel):
    """Schema for reading a campaign - matches Campaign.to_dict() output"""
    name: str
    description: Optional[str] = None
    campaign_type: Optional[str] = Field(None, alias="campaignType")
    target_segment: Optional[str] = Field(None, alias="targetSegment")
    target_criteria: Optional[Dict[str, Any]] = Field(None, alias="targetCriteria")
    message_template: Optional[str] = Field(None, alias="messageTemplate")
    subject: Optional[str] = None
    scheduled_at: Optional[datetime] = Field(None, alias="scheduledAt")
    sent_at: Optional[datetime] = Field(None, alias="sentAt")
    status: Optional[str] = None
    
    # Stats
    total_recipients: Optional[int] = Field(0, alias="totalRecipients")
    successful_sends: Optional[int] = Field(0, alias="successfulSends")
    failed_sends: Optional[int] = Field(0, alias="failedSends")
    
    # Cost
    estimated_cost: Optional[float] = Field(0.0, alias="estimatedCost")
    actual_cost: Optional[float] = Field(0.0, alias="actualCost")

class CampaignSendRequest(AppBaseModel):
    """Specific request model for triggering campaign send/preview"""
    sender_id: Optional[str] = Field(None, alias="senderId")
    is_preview: bool = Field(False, alias="isPreview")
    preview_phone: Optional[str] = Field(None, alias="previewPhone")

# Type aliases for frontend compatibility
Campaign = CampaignRead
CampaignInput = CampaignCreate

# --- SMS Log (Campaign Result) Schemas ---
class SMSLogStatus(str, Enum):
    PENDING = 'pending'
    SENT = 'sent'
    DELIVERED = 'delivered'
    FAILED = 'failed'

class SMSLogRead(IDMixin, TimestampMixin):
    campaign_id: Optional[str] = Field(None, alias="campaignId")
    party_id: Optional[str] = Field(None, alias="partyId")
    phone_number: str = Field(..., alias="phoneNumber")
    message: str
    status: SMSLogStatus
    
    sent_at: Optional[datetime] = Field(None, alias="sentAt")
    delivered_at: Optional[datetime] = Field(None, alias="deliveredAt")
    
    error_message: Optional[str] = Field(None, alias="errorMessage")
    cost: Optional[float] = 0.0
