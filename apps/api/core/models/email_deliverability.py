"""Email Deliverability Models.

Models for tracking bounces, unsubscribes, DMARC reports, complaints, and metrics.
"""
from sqlalchemy import Column, Boolean, Date, DateTime, Float, ForeignKey, Integer, JSON, String, Text, Time, Index
from sqlalchemy.orm import relationship
from core.models.base import Base
from .base import db, BaseModel, gen_id, JSONMixin
from .mixins import TenantScopedMixin
from datetime import datetime, timezone


class EmailBounce(BaseModel, JSONMixin, TenantScopedMixin):
    """Email bounce tracking model."""
    __tablename__ = 'email_bounce'

    id = Column(String(50), primary_key=True, default=lambda: gen_id("bounce"))
    # tenant_id is now inherited from TenantScopedMixin
    email_log_id = Column(String(50), ForeignKey('email_logs.id'), nullable=True)
    recipient = Column(String(255), nullable=False)
    bounce_type = Column(String(20), nullable=False)  # hard, soft, block
    bounce_reason = Column(Text, nullable=True)
    smtp_code = Column(Integer, nullable=True)
    bounce_count = Column(Integer, default=1, nullable=False)
    first_bounce_at = Column(DateTime, nullable=False)
    last_bounce_at = Column(DateTime, nullable=False)
    is_blacklisted = Column(Boolean, default=False, nullable=False)

    # Relationships
    email_log = relationship('EmailLog', backref='bounces', lazy=True)
    
    # Override mapper to exclude created_at/updated_at from queries (not in DB yet)
    __mapper_args__ = {
        'exclude_properties': ['created_at', 'updated_at']
    }

    __table_args__ = (
        Index('ix_email_bounce_tenant_recipient', 'tenant_id', 'recipient'),
        Index('ix_email_bounce_tenant_blacklisted', 'tenant_id', 'is_blacklisted'),
        Index('ix_email_bounce_type', 'bounce_type'),
    )


class EmailUnsubscribe(BaseModel, JSONMixin, TenantScopedMixin):
    """Email unsubscribe preferences model."""
    __tablename__ = 'email_unsubscribe'

    id = Column(String(50), primary_key=True, default=lambda: gen_id("unsub"))
    # tenant_id is now inherited from TenantScopedMixin
    recipient = Column(String(255), nullable=False)
    scenario = Column(String(100), nullable=False)
    unsubscribed_at = Column(DateTime, nullable=False)
    unsubscribe_token = Column(String(64), nullable=False, unique=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # Override mapper to exclude created_at/updated_at from queries (not in DB yet)
    __mapper_args__ = {
        'exclude_properties': ['created_at', 'updated_at']
    }

    __table_args__ = (
        Index('ix_email_unsubscribe_tenant_recipient_scenario', 'tenant_id', 'recipient', 'scenario', unique=True),
        Index('ix_email_unsubscribe_token', 'unsubscribe_token'),
    )


class DMARCReport(BaseModel, JSONMixin, TenantScopedMixin):
    """DMARC aggregate report model."""
    __tablename__ = 'dmarc_report'

    id = Column(String(50), primary_key=True, default=lambda: gen_id("dmarc"))
    # tenant_id is now inherited from TenantScopedMixin
    report_id = Column(String(255), nullable=False)
    org_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    date_begin = Column(DateTime, nullable=False)
    date_end = Column(DateTime, nullable=False)
    domain = Column(String(255), nullable=False)
    policy_published = Column(Text, nullable=True)  # JSON
    records = Column(Text, nullable=True)  # JSON array
    pass_count = Column(Integer, default=0)
    fail_count = Column(Integer, default=0)
    failure_rate = Column(Float, default=0.0)

    @property
    def policy_published_json(self):
        return self.json_load(self.policy_published) or {}
    
    @policy_published_json.setter
    def policy_published_json(self, value):
        self.policy_published = self.json_dump(value or {})

    @property
    def records_json(self):
        return self.json_load(self.records) or []
    
    @records_json.setter
    def records_json(self, value):
        self.records = self.json_dump(value or [])

    __table_args__ = (
        Index('ix_dmarc_report_tenant_domain', 'tenant_id', 'domain'),
        Index('ix_dmarc_report_date_begin', 'date_begin'),
    )


class EmailComplaint(BaseModel, JSONMixin, TenantScopedMixin):
    """Email spam complaint model."""
    __tablename__ = 'email_complaint'
    __mapper_args__ = {
        'exclude_properties': ['created_at', 'updated_at']  # Exclude BaseModel timestamps
    }

    id = Column(String(50), primary_key=True, default=lambda: gen_id("complaint"))
    # tenant_id is now inherited from TenantScopedMixin
    email_log_id = Column(String(50), ForeignKey('email_logs.id'), nullable=True)
    recipient = Column(String(255), nullable=False)
    complaint_type = Column(String(50), nullable=False)
    feedback_loop_provider = Column(String(100), nullable=True)
    complained_at = Column(DateTime, nullable=False)

    # Relationships
    email_log = relationship('EmailLog', backref='complaints', lazy=True)

    __table_args__ = (
        Index('ix_email_complaint_tenant_recipient', 'tenant_id', 'recipient'),
        Index('ix_email_complaint_type', 'complaint_type'),
    )


class DeliverabilityMetrics(Base, TenantScopedMixin):
    """Daily deliverability metrics snapshot."""
    __tablename__ = 'deliverability_metrics'

    id = Column(String(50), primary_key=True, default=lambda: gen_id("metrics"))
    # tenant_id is now inherited from TenantScopedMixin
    date = Column(Date, nullable=False)
    emails_sent = Column(Integer, default=0)
    emails_delivered = Column(Integer, default=0)
    emails_bounced = Column(Integer, default=0)
    emails_complained = Column(Integer, default=0)
    bounce_rate = Column(Float, default=0.0)
    complaint_rate = Column(Float, default=0.0)
    deliverability_rate = Column(Float, default=0.0)
    
    # Timestamps (required by schema but missing in DB)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index('ix_deliverability_metrics_tenant_date', 'tenant_id', 'date', unique=True),
    )


class EmailApproval(Base, TenantScopedMixin):
    """Email approval workflow model for AI-generated emails."""
    __tablename__ = 'email_approval'

    id = Column(String(50), primary_key=True, default=lambda: gen_id("approval"))
    # tenant_id is now inherited from TenantScopedMixin
    email_log_id = Column(String(50), ForeignKey('email_logs.id'), nullable=True)
    recipient = Column(String(255), nullable=False)
    subject = Column(String(500), nullable=False)
    body_text = Column(Text, nullable=False)
    body_html = Column(Text, nullable=True)
    scenario = Column(String(100), nullable=False)
    risk_level = Column(String(20), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    risk_reasons = Column(Text, nullable=True)  # JSON array
    spam_score = Column(Float, nullable=True)
    status = Column(String(20), default='pending', nullable=False)  # pending, approved, rejected
    action_plan_hash = Column(String(64), nullable=True)  # For AI-generated emails
    requested_at = Column(DateTime, nullable=False)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(String(36), nullable=True)  # User ID
    review_notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    email_log = relationship('EmailLog', backref='approvals', lazy=True)

    __table_args__ = (
        Index('ix_email_approval_tenant_status', 'tenant_id', 'status'),
        Index('ix_email_approval_risk_level', 'risk_level'),
        Index('ix_email_approval_action_plan_hash', 'action_plan_hash'),
        Index('ix_email_approval_requested_at', 'requested_at'),
    )
