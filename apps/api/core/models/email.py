"""
Email system models for SMTP configuration, email logs, and templates.

This module contains the database models for the SMTP Email Integration feature:
- TenantSMTPConfig: Tenant-specific SMTP configurations with encrypted passwords
- SMTPEmailLog: Audit trail of all email sending attempts
- EmailTemplate: Email templates with Jinja2 syntax (Phase 2 - admin-editable)
"""
from .base import BaseModel, gen_id, now_utc
from .mixins import TenantScopedMixin
from sqlalchemy import Column, Index, Boolean, DateTime, Integer, JSON, String, Text
from sqlalchemy.orm import relationship


class TenantSMTPConfig(BaseModel, TenantScopedMixin):
    """Tenant-specific SMTP configuration with encrypted password.

    Stores SMTP server settings for each tenant. Passwords are encrypted
    using AES-256-GCM before storage. Multiple configurations can exist
    per tenant, but only one should be active at a time.
    """
    __tablename__ = "tenant_smtp_config"

    id = Column(String(36), primary_key=True)
    # tenant_id is now inherited from TenantScopedMixin

    # SMTP server configuration
    host = Column(String(255), nullable=False)
    port = Column(Integer, nullable=False)
    username = Column(String(255), nullable=False)
    encrypted_password = Column(Text, nullable=False)  # AES-256-GCM encrypted

    # Email sender configuration
    from_email = Column(String(255), nullable=False)
    from_name = Column(String(255), nullable=False)

    # Connection settings
    use_tls = Column(Boolean, default=False)
    use_ssl = Column(Boolean, default=True)
    timeout = Column(Integer, default=30)

    # Status
    is_active = Column(Boolean, default=True, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    tenant = relationship("Tenant", back_populates="smtp_configs")

    # Indexes
    __table_args__ = (
        Index("ix_tenant_smtp_config_tenant_active", "tenant_id", "is_active"),
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = gen_id("smtp")

    def __repr__(self):
        return f"<TenantSMTPConfig {self.id} tenant={self.tenant_id} host={self.host}>"


class SMTPEmailLog(BaseModel, TenantScopedMixin):
    """Audit log for SMTP email sending attempts.

    Records every SMTP email send attempt with status, error details, and retry count.
    Used for compliance, troubleshooting, and monitoring email delivery.

    Note: This is separate from the campaign EmailLog in communication.py which uses
    table 'email_logs' for marketing/communication campaigns.
    """
    __tablename__ = "smtp_email_log"

    id = Column(String(36), primary_key=True)
    # tenant_id is now inherited from TenantScopedMixin

    # Email details
    recipient = Column(String(255), nullable=False, index=True)
    subject = Column(String(500), nullable=False)
    body_preview = Column(Text, nullable=True)  # First 500 chars

    # Status tracking
    status = Column(String(20), nullable=False, index=True)  # sent, failed, bounced, pending
    sent_at = Column(DateTime(timezone=True), nullable=True, index=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)

    # Template information
    template_name = Column(String(100), nullable=True)
    scenario = Column(String(100), nullable=True)  # password_reset, user_invite, etc.

    # Idempotency
    idempotency_key = Column(String(128), nullable=True, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    tenant = relationship("Tenant")

    # Indexes
    __table_args__ = (
        Index("ix_smtp_email_log_tenant_status_sent", "tenant_id", "status", "sent_at"),
        Index("ix_smtp_email_log_tenant_idempotency", "tenant_id", "idempotency_key"),
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = gen_id("eml")

    def __repr__(self):
        return f"<SMTPEmailLog {self.id} recipient={self.recipient} status={self.status}>"


class EmailTemplate(BaseModel):
    """Email templates with Jinja2 syntax.

    NOTE: Phase 1 uses filesystem templates (templates/email/).
    This table is for Phase 2 admin-editable templates.
    """
    __tablename__ = "email_template"

    id = Column(String(36), primary_key=True)

    # Template identification
    name = Column(String(100), nullable=False, index=True)  # password_reset, user_invite
    language_code = Column(String(5), nullable=False, index=True)  # tr, en

    # Template content
    subject_template = Column(String(500), nullable=False)
    html_template = Column(Text, nullable=False)
    text_template = Column(Text, nullable=False)

    # Variable schema for validation
    variables_schema = Column(JSON, nullable=False)  # JSON schema for validation

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Indexes
    __table_args__ = (
        Index("ix_email_template_name_lang", "name", "language_code", unique=True),
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = gen_id("etpl")

    def __repr__(self):
        return f"<EmailTemplate {self.name} lang={self.language_code}>"
