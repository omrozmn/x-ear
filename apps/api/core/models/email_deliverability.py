"""Email Deliverability Models.

Models for tracking bounces, unsubscribes, DMARC reports, complaints, and metrics.
"""
from .base import db, BaseModel, gen_id, JSONMixin
from datetime import datetime, timezone


class EmailBounce(BaseModel, JSONMixin):
    """Email bounce tracking model."""
    __tablename__ = 'email_bounce'

    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id("bounce"))
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=False, index=True)
    email_log_id = db.Column(db.String(50), db.ForeignKey('email_logs.id'), nullable=True)
    recipient = db.Column(db.String(255), nullable=False)
    bounce_type = db.Column(db.String(20), nullable=False)  # hard, soft, block
    bounce_reason = db.Column(db.Text, nullable=True)
    smtp_code = db.Column(db.Integer, nullable=True)
    bounce_count = db.Column(db.Integer, default=1, nullable=False)
    first_bounce_at = db.Column(db.DateTime, nullable=False)
    last_bounce_at = db.Column(db.DateTime, nullable=False)
    is_blacklisted = db.Column(db.Boolean, default=False, nullable=False)

    # Relationships
    email_log = db.relationship('EmailLog', backref='bounces', lazy=True)

    __table_args__ = (
        db.Index('ix_email_bounce_tenant_recipient', 'tenant_id', 'recipient'),
        db.Index('ix_email_bounce_tenant_blacklisted', 'tenant_id', 'is_blacklisted'),
        db.Index('ix_email_bounce_type', 'bounce_type'),
    )


class EmailUnsubscribe(BaseModel, JSONMixin):
    """Email unsubscribe preferences model."""
    __tablename__ = 'email_unsubscribe'

    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id("unsub"))
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=False, index=True)
    recipient = db.Column(db.String(255), nullable=False)
    scenario = db.Column(db.String(100), nullable=False)
    unsubscribed_at = db.Column(db.DateTime, nullable=False)
    unsubscribe_token = db.Column(db.String(64), nullable=False, unique=True)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.Text, nullable=True)

    __table_args__ = (
        db.Index('ix_email_unsubscribe_tenant_recipient_scenario', 'tenant_id', 'recipient', 'scenario', unique=True),
        db.Index('ix_email_unsubscribe_token', 'unsubscribe_token'),
    )


class DMARCReport(BaseModel, JSONMixin):
    """DMARC aggregate report model."""
    __tablename__ = 'dmarc_report'

    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id("dmarc"))
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=False, index=True)
    report_id = db.Column(db.String(255), nullable=False)
    org_name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), nullable=True)
    date_begin = db.Column(db.DateTime, nullable=False)
    date_end = db.Column(db.DateTime, nullable=False)
    domain = db.Column(db.String(255), nullable=False)
    policy_published = db.Column(db.Text, nullable=True)  # JSON
    records = db.Column(db.Text, nullable=True)  # JSON array
    pass_count = db.Column(db.Integer, default=0)
    fail_count = db.Column(db.Integer, default=0)
    failure_rate = db.Column(db.Float, default=0.0)

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
        db.Index('ix_dmarc_report_tenant_domain', 'tenant_id', 'domain'),
        db.Index('ix_dmarc_report_date_begin', 'date_begin'),
    )


class EmailComplaint(BaseModel, JSONMixin):
    """Email spam complaint model."""
    __tablename__ = 'email_complaint'

    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id("complaint"))
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=False, index=True)
    email_log_id = db.Column(db.String(50), db.ForeignKey('email_logs.id'), nullable=True)
    recipient = db.Column(db.String(255), nullable=False)
    complaint_type = db.Column(db.String(50), nullable=False)
    feedback_loop_provider = db.Column(db.String(100), nullable=True)
    complained_at = db.Column(db.DateTime, nullable=False)

    # Relationships
    email_log = db.relationship('EmailLog', backref='complaints', lazy=True)

    __table_args__ = (
        db.Index('ix_email_complaint_tenant_recipient', 'tenant_id', 'recipient'),
        db.Index('ix_email_complaint_type', 'complaint_type'),
    )


class DeliverabilityMetrics(BaseModel, JSONMixin):
    """Daily deliverability metrics snapshot."""
    __tablename__ = 'deliverability_metrics'

    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id("metrics"))
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False)
    emails_sent = db.Column(db.Integer, default=0)
    emails_delivered = db.Column(db.Integer, default=0)
    emails_bounced = db.Column(db.Integer, default=0)
    emails_complained = db.Column(db.Integer, default=0)
    bounce_rate = db.Column(db.Float, default=0.0)
    complaint_rate = db.Column(db.Float, default=0.0)
    deliverability_rate = db.Column(db.Float, default=0.0)

    __table_args__ = (
        db.Index('ix_deliverability_metrics_tenant_date', 'tenant_id', 'date', unique=True),
    )
