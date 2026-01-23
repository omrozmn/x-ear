"""
Email Integration Schemas

Pydantic schemas for SMTP email integration API contracts.
All schemas use camelCase for JSON serialization via alias_generator.
"""
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import EmailStr, Field, field_validator

from schemas.base import AppBaseModel, IDMixin, TimestampMixin


class EmailStatus(str, Enum):
    """Email status enum"""
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    BOUNCED = "bounced"


# ============================================================================
# SMTP Configuration Schemas
# ============================================================================

class SMTPConfigBase(AppBaseModel):
    """Base schema for SMTP configuration."""
    host: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="SMTP server hostname or IP"
    )
    port: int = Field(
        ...,
        ge=1,
        le=65535,
        description="SMTP server port"
    )
    username: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="SMTP authentication username"
    )
    from_email: EmailStr = Field(
        ...,
        description="From email address"
    )
    from_name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="From display name"
    )
    use_tls: bool = Field(
        default=False,
        description="Use STARTTLS"
    )
    use_ssl: bool = Field(
        default=True,
        description="Use SSL/TLS"
    )
    timeout: int = Field(
        default=30,
        ge=5,
        le=120,
        description="Connection timeout in seconds"
    )

    @field_validator('from_email')
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        """Validate email format using EmailStr validation."""
        # EmailStr already validates format, this is for additional checks if needed
        if not v or '@' not in v:
            raise ValueError('Invalid email format')
        return v

    @field_validator('port')
    @classmethod
    def validate_port_range(cls, v: int) -> int:
        """Validate port is in valid range."""
        if not 1 <= v <= 65535:
            raise ValueError('Port must be between 1 and 65535')
        return v

    @field_validator('timeout')
    @classmethod
    def validate_timeout_range(cls, v: int) -> int:
        """Validate timeout is in valid range."""
        if not 5 <= v <= 120:
            raise ValueError('Timeout must be between 5 and 120 seconds')
        return v


class SMTPConfigCreate(SMTPConfigBase):
    """Schema for creating SMTP configuration."""
    password: str = Field(
        ...,
        min_length=1,
        description="SMTP authentication password (will be encrypted)"
    )


class SMTPConfigUpdate(SMTPConfigBase):
    """Schema for updating SMTP configuration."""
    password: Optional[str] = Field(
        None,
        description="SMTP authentication password (optional, will be encrypted)"
    )


class SMTPConfigResponse(SMTPConfigBase, IDMixin, TimestampMixin):
    """Schema for SMTP configuration response.
    
    Note: password is NEVER included in response for security.
    """
    tenant_id: str
    is_active: bool

    # Explicitly exclude password from model
    model_config = {
        **AppBaseModel.model_config,
        "json_schema_extra": {
            "description": "SMTP configuration (password excluded for security)"
        }
    }


# ============================================================================
# Test Email Schemas
# ============================================================================

class SendTestEmailRequest(AppBaseModel):
    """Schema for test email request."""
    recipient: EmailStr = Field(
        ...,
        description="Test email recipient"
    )


class SendTestEmailResponse(AppBaseModel):
    """Schema for test email response."""
    success: bool
    message: str
    sent_at: Optional[datetime] = None


# ============================================================================
# Email Sending Schemas
# ============================================================================

class SendEmailRequest(AppBaseModel):
    """Schema for manual email sending."""
    recipients: list[EmailStr] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Email recipients"
    )
    subject: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Email subject"
    )
    body_html: str = Field(
        ...,
        min_length=1,
        description="HTML email body"
    )
    body_text: Optional[str] = Field(
        None,
        description="Plain text email body (optional)"
    )
    template_name: Optional[str] = Field(
        None,
        description="Template name if using template"
    )
    template_variables: Optional[dict[str, Any]] = Field(
        None,
        description="Template variables"
    )

    @field_validator('recipients')
    @classmethod
    def validate_recipients_count(cls, v: list[EmailStr]) -> list[EmailStr]:
        """Validate recipients list is not empty and within limits."""
        if not v:
            raise ValueError('At least one recipient is required')
        if len(v) > 100:
            raise ValueError('Maximum 100 recipients allowed')
        return v


class SendEmailResponse(AppBaseModel):
    """Schema for email sending response."""
    email_ids: list[str] = Field(
        ...,
        description="Email log IDs for tracking"
    )
    queued_count: int = Field(
        ...,
        description="Number of emails queued for sending"
    )
    message: str = Field(
        ...,
        description="Status message"
    )


# ============================================================================
# Email Log Schemas
# ============================================================================

class EmailLogResponse(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for email log response."""
    tenant_id: str
    recipient: str
    subject: str
    body_preview: Optional[str] = None
    status: EmailStatus
    sent_at: Optional[datetime] = None
    error_message: Optional[str] = None
    retry_count: int = Field(default=0)
    template_name: Optional[str] = None
    scenario: Optional[str] = None


class EmailLogListRequest(AppBaseModel):
    """Schema for email log list request with filters."""
    page: int = Field(
        default=1,
        ge=1,
        description="Page number"
    )
    per_page: int = Field(
        default=25,
        ge=10,
        le=100,
        description="Items per page",
        alias="perPage"
    )
    status: Optional[str] = Field(
        None,
        description="Filter by status"
    )
    recipient: Optional[str] = Field(
        None,
        description="Filter by recipient email"
    )
    date_from: Optional[datetime] = Field(
        None,
        description="Filter by date from",
        alias="dateFrom"
    )
    date_to: Optional[datetime] = Field(
        None,
        description="Filter by date to",
        alias="dateTo"
    )

    @field_validator('per_page')
    @classmethod
    def validate_per_page_range(cls, v: int) -> int:
        """Validate per_page is in valid range."""
        if not 10 <= v <= 100:
            raise ValueError('perPage must be between 10 and 100')
        return v


class EmailLogListResponse(AppBaseModel):
    """Schema for email log list response."""
    items: list[EmailLogResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
