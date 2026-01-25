"""
Email system models for SMTP configuration, email logs, and templates.

This module contains the database models for the SMTP Email Integration feature:
- TenantSMTPConfig: Tenant-specific SMTP configurations with encrypted passwords
- SMTPEmailLog: Audit trail of all email sending attempts
- EmailTemplate: Email templates with Jinja2 syntax (Phase 2 - admin-editable)
"""
from .base import db, BaseModel, gen_id, now_utc
from .mixins import TenantScopedMixin
from sqlalchemy import Index


class TenantSMTPConfig(BaseModel, TenantScopedMixin):
    """Tenant-specific SMTP configuration with encrypted password.

    Stores SMTP server settings for each tenant. Passwords are encrypted
    using AES-256-GCM before storage. Multiple configurations can exist
    per tenant, but only one should be active at a time.
    """
    __tablename__ = "tenant_smtp_config"

    id = db.Column(db.String(36), primary_key=True)
    # tenant_id is now inherited from TenantScopedMixin

    # SMTP server configuration
    host = db.Column(db.String(255), nullable=False)
    port = db.Column(db.Integer, nullable=False)
    username = db.Column(db.String(255), nullable=False)
    encrypted_password = db.Column(db.Text, nullable=False)  # AES-256-GCM encrypted

    # Email sender configuration
    from_email = db.Column(db.String(255), nullable=False)
    from_name = db.Column(db.String(255), nullable=False)

    # Connection settings
    use_tls = db.Column(db.Boolean, default=False)
    use_ssl = db.Column(db.Boolean, default=True)
    timeout = db.Column(db.Integer, default=30)

    # Status
    is_active = db.Column(db.Boolean, default=True, index=True)

    # Timestamps
    created_at = db.Column(db.DateTime(timezone=True), default=now_utc)
    updated_at = db.Column(db.DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    tenant = db.relationship("Tenant", back_populates="smtp_configs")

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

    id = db.Column(db.String(36), primary_key=True)
    # tenant_id is now inherited from TenantScopedMixin

    # Email details
    recipient = db.Column(db.String(255), nullable=False, index=True)
    subject = db.Column(db.String(500), nullable=False)
    body_preview = db.Column(db.Text, nullable=True)  # First 500 chars

    # Status tracking
    status = db.Column(db.String(20), nullable=False, index=True)  # sent, failed, bounced, pending
    sent_at = db.Column(db.DateTime(timezone=True), nullable=True, index=True)
    error_message = db.Column(db.Text, nullable=True)
    retry_count = db.Column(db.Integer, default=0)

    # Template information
    template_name = db.Column(db.String(100), nullable=True)
    scenario = db.Column(db.String(100), nullable=True)  # password_reset, user_invite, etc.

    # Idempotency
    idempotency_key = db.Column(db.String(128), nullable=True, index=True)

    # Timestamps
    created_at = db.Column(db.DateTime(timezone=True), default=now_utc)
    updated_at = db.Column(db.DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # Relationships
    tenant = db.relationship("Tenant")

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

    id = db.Column(db.String(36), primary_key=True)

    # Template identification
    name = db.Column(db.String(100), nullable=False, index=True)  # password_reset, user_invite
    language_code = db.Column(db.String(5), nullable=False, index=True)  # tr, en

    # Template content
    subject_template = db.Column(db.String(500), nullable=False)
    html_template = db.Column(db.Text, nullable=False)
    text_template = db.Column(db.Text, nullable=False)

    # Variable schema for validation
    variables_schema = db.Column(db.JSON, nullable=False)  # JSON schema for validation

    # Timestamps
    created_at = db.Column(db.DateTime(timezone=True), default=now_utc)
    updated_at = db.Column(db.DateTime(timezone=True), default=now_utc, onupdate=now_utc)

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
