"""
Communication Schemas for X-Ear CRM
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import Field, ConfigDict, BaseModel
from pydantic.alias_generators import to_camel
from .base import AppBaseModel, IDMixin, TimestampMixin

class EmailLogRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading EmailLog - replaces to_dict()"""
    campaign_id: Optional[str] = Field(None, alias="campaignId")
    party_id: Optional[str] = Field(None, alias="partyId")
    template_id: Optional[str] = Field(None, alias="templateId")
    to_email: str = Field(..., alias="toEmail")
    from_email: str = Field(..., alias="fromEmail")
    cc_emails: Optional[List[str]] = Field(default=[], alias="ccEmails")
    bcc_emails: Optional[List[str]] = Field(default=[], alias="bccEmails")
    subject: str
    body_text: Optional[str] = Field(None, alias="bodyText")
    body_html: Optional[str] = Field(None, alias="bodyHtml")
    attachments: Optional[List[Dict[str, Any]]] = Field(default=[])
    status: str
    provider_response: Optional[Dict[str, Any]] = Field(None, alias="providerResponse")
    provider_message_id: Optional[str] = Field(None, alias="providerMessageId")
    sent_at: Optional[datetime] = Field(None, alias="sentAt")
    delivered_at: Optional[datetime] = Field(None, alias="deliveredAt")
    opened_at: Optional[datetime] = Field(None, alias="openedAt")
    clicked_at: Optional[datetime] = Field(None, alias="clickedAt")
    bounced_at: Optional[datetime] = Field(None, alias="bouncedAt")
    error_message: Optional[str] = Field(None, alias="errorMessage")
    retry_count: int = Field(0, alias="retryCount")
    cost: Optional[float] = None
    
    @classmethod
    def from_orm_with_json(cls, obj) -> "EmailLogRead":
        """Create from ORM object, handling JSON fields"""
        return cls(
            id=obj.id,
            campaign_id=obj.campaign_id,
            party_id=obj.party_id,
            template_id=obj.template_id,
            to_email=obj.to_email,
            from_email=obj.from_email,
            cc_emails=obj.cc_emails_json,
            bcc_emails=obj.bcc_emails_json,
            subject=obj.subject,
            body_text=obj.body_text,
            body_html=obj.body_html,
            attachments=obj.attachments_json,
            status=obj.status,
            provider_response=obj.provider_response_json,
            provider_message_id=obj.provider_message_id,
            sent_at=obj.sent_at,
            delivered_at=obj.delivered_at,
            opened_at=obj.opened_at,
            clicked_at=obj.clicked_at,
            bounced_at=obj.bounced_at,
            error_message=obj.error_message,
            retry_count=obj.retry_count or 0,
            cost=float(obj.cost) if obj.cost else None,
            created_at=obj.created_at,
            updated_at=obj.updated_at
        )


class CommunicationTemplateRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading CommunicationTemplate - replaces to_dict()"""
    name: str
    description: Optional[str] = None
    template_type: str = Field(..., alias="templateType")
    category: Optional[str] = None
    subject: Optional[str] = None
    body_text: str = Field(..., alias="bodyText")
    body_html: Optional[str] = Field(None, alias="bodyHtml")
    variables: Optional[List[str]] = Field(default=[])
    is_active: bool = Field(True, alias="isActive")
    is_system: bool = Field(False, alias="isSystem")
    usage_count: int = Field(0, alias="usageCount")
    last_used_at: Optional[datetime] = Field(None, alias="lastUsedAt")
    
    @classmethod
    def from_orm_with_json(cls, obj) -> "CommunicationTemplateRead":
        """Create from ORM object, handling JSON fields"""
        return cls(
            id=obj.id,
            name=obj.name,
            description=obj.description,
            template_type=obj.template_type,
            category=obj.category,
            subject=obj.subject,
            body_text=obj.body_text,
            body_html=obj.body_html,
            variables=obj.variables_json,
            is_active=obj.is_active,
            is_system=obj.is_system,
            usage_count=obj.usage_count or 0,
            last_used_at=obj.last_used_at,
            created_at=obj.created_at,
            updated_at=obj.updated_at
        )


class CommunicationHistoryRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading CommunicationHistory - replaces to_dict()"""
    party_id: str = Field(..., alias="partyId")
    campaign_id: Optional[str] = Field(None, alias="campaignId")
    template_id: Optional[str] = Field(None, alias="templateId")
    sms_log_id: Optional[str] = Field(None, alias="smsLogId")
    email_log_id: Optional[str] = Field(None, alias="emailLogId")
    communication_type: str = Field(..., alias="communicationType")
    direction: str
    subject: Optional[str] = None
    content: Optional[str] = None
    contact_method: Optional[str] = Field(None, alias="contactMethod")
    status: str = "completed"
    priority: str = "normal"
    metadata: Optional[Dict[str, Any]] = Field(default={})
    initiated_by: Optional[str] = Field(None, alias="initiatedBy")
    
    @classmethod
    def from_orm_with_json(cls, obj) -> "CommunicationHistoryRead":
        """Create from ORM object, handling JSON fields"""
        return cls(
            id=obj.id,
            party_id=obj.party_id,
            campaign_id=obj.campaign_id,
            template_id=obj.template_id,
            sms_log_id=obj.sms_log_id,
            email_log_id=obj.email_log_id,
            communication_type=obj.communication_type,
            direction=obj.direction,
            subject=obj.subject,
            content=obj.content,
            contact_method=obj.contact_method,
            status=obj.status,
            priority=obj.priority,
            metadata=obj.metadata_json,
            initiated_by=obj.initiated_by,
            created_at=obj.created_at,
            updated_at=obj.updated_at
        )


class SendSms(AppBaseModel):
    phone_number: str = Field(..., alias="phoneNumber")
    message: str
    party_id: Optional[str] = Field(None, alias="partyId")
    campaign_id: Optional[str] = Field(None, alias="campaignId")


class SendEmail(AppBaseModel):
    to_email: str = Field(..., alias="toEmail")
    subject: str
    body_text: str = Field(..., alias="bodyText")
    body_html: Optional[str] = Field(None, alias="bodyHtml")
    from_email: Optional[str] = Field("noreply@x-ear.com", alias="fromEmail")
    cc_emails: Optional[List[str]] = Field([], alias="ccEmails")
    bcc_emails: Optional[List[str]] = Field([], alias="bccEmails")
    attachments: Optional[List[Dict]] = []
    party_id: Optional[str] = Field(None, alias="partyId")
    campaign_id: Optional[str] = Field(None, alias="campaignId")
    template_id: Optional[str] = Field(None, alias="templateId")


class TemplateCreate(AppBaseModel):
    name: str
    template_type: str = Field(..., alias="templateType")
    body_text: str = Field(..., alias="bodyText")
    description: Optional[str] = None
    category: Optional[str] = None
    subject: Optional[str] = None
    body_html: Optional[str] = Field(None, alias="bodyHtml")
    variables: Optional[List[str]] = []
    is_active: Optional[bool] = Field(True, alias="isActive")


class HistoryCreate(AppBaseModel):
    party_id: str = Field(..., alias="partyId")
    communication_type: str = Field(..., alias="communicationType")
    direction: str
    subject: Optional[str] = None
    content: Optional[str] = None
    contact_method: Optional[str] = Field(None, alias="contactMethod")
    status: Optional[str] = "completed"
    priority: Optional[str] = "normal"
    metadata: Optional[Dict[str, Any]] = {}
    initiated_by: Optional[str] = Field(None, alias="initiatedBy")
