# Communication Models (formerly Patient communication models)
from sqlalchemy import Column, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, Index
from sqlalchemy.orm import relationship
from .base import BaseModel, gen_id, JSONMixin
from .mixins import TenantScopedMixin
from datetime import datetime, timezone

class EmailLog(BaseModel, JSONMixin, TenantScopedMixin):
    """Email communication log model"""
    __tablename__ = 'email_logs'

    # Primary key with auto-generated default
    id = Column(String(50), primary_key=True, default=lambda: gen_id("email"))
    
    # Foreign keys
    campaign_id = Column(String(50), ForeignKey('campaigns.id'), nullable=True)
    party_id = Column(String(50), ForeignKey('parties.id'), nullable=True)
    template_id = Column(String(50), ForeignKey('communication_templates.id'), nullable=True)
    # tenant_id is now inherited from TenantScopedMixin
    
    # Email details
    to_email = Column(String(255), nullable=False)
    from_email = Column(String(255), nullable=False)
    cc_emails = Column(Text)  # JSON array of CC emails
    bcc_emails = Column(Text)  # JSON array of BCC emails
    subject = Column(String(500), nullable=False)
    body_text = Column(Text)  # Plain text version
    body_html = Column(Text)  # HTML version
    
    # Attachments
    attachments = Column(Text)  # JSON array of attachment info
    
    # Status tracking
    status = Column(String(20), default='pending')  # pending, sent, delivered, failed, bounced
    provider_response = Column(Text)  # JSON string
    provider_message_id = Column(String(255))  # Provider's message ID for tracking
    
    # Timestamps
    sent_at = Column(DateTime)
    delivered_at = Column(DateTime)
    opened_at = Column(DateTime)
    clicked_at = Column(DateTime)
    bounced_at = Column(DateTime)
    
    # Error handling
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    
    # Cost tracking
    cost = Column(Float)

    # Relationships
    party = relationship('Party', backref='email_logs', lazy=True)
    template = relationship('CommunicationTemplate', backref='email_logs', lazy=True)

    @property
    def cc_emails_json(self):
        return self.json_load(self.cc_emails) or []
    
    @cc_emails_json.setter
    def cc_emails_json(self, value):
        self.cc_emails = self.json_dump(value or [])

    @property
    def bcc_emails_json(self):
        return self.json_load(self.bcc_emails) or []
    
    @bcc_emails_json.setter
    def bcc_emails_json(self, value):
        self.bcc_emails = self.json_dump(value or [])

    @property
    def attachments_json(self):
        return self.json_load(self.attachments) or []
    
    @attachments_json.setter
    def attachments_json(self, value):
        self.attachments = self.json_dump(value or [])

    @property
    def provider_response_json(self):
        return self.json_load(self.provider_response)
    
    @provider_response_json.setter
    def provider_response_json(self, value):
        self.provider_response = self.json_dump(value)

    def to_dict(self):
        base_dict = self.to_dict_base()
        email_dict = {
            'id': self.id,
            'campaignId': self.campaign_id,
            'partyId': self.party_id,
            'templateId': self.template_id,
            'toEmail': self.to_email,
            'fromEmail': self.from_email,
            'ccEmails': self.cc_emails_json,
            'bccEmails': self.bcc_emails_json,
            'subject': self.subject,
            'bodyText': self.body_text,
            'bodyHtml': self.body_html,
            'attachments': self.attachments_json,
            'status': self.status,
            'providerResponse': self.provider_response_json,
            'providerMessageId': self.provider_message_id,
            'sentAt': self.sent_at.isoformat() if self.sent_at else None,
            'deliveredAt': self.delivered_at.isoformat() if self.delivered_at else None,
            'openedAt': self.opened_at.isoformat() if self.opened_at else None,
            'clickedAt': self.clicked_at.isoformat() if self.clicked_at else None,
            'bouncedAt': self.bounced_at.isoformat() if self.bounced_at else None,
            'errorMessage': self.error_message,
            'retryCount': self.retry_count,
            'cost': float(self.cost) if self.cost else None
        }
        email_dict.update(base_dict)
        return email_dict

    # Index suggestions
    __table_args__ = (
        Index('ix_email_campaign', 'campaign_id'),
        Index('ix_email_patient', 'party_id'),
        Index('ix_email_template', 'template_id'),
        Index('ix_email_status', 'status'),
        Index('ix_email_sent_at', 'sent_at'),
        Index('ix_email_to_email', 'to_email'),
    )


class CommunicationTemplate(BaseModel, JSONMixin, TenantScopedMixin):
    """Communication template model for SMS and Email templates"""
    __tablename__ = 'communication_templates'

    # Primary key with auto-generated default
    id = Column(String(50), primary_key=True, default=lambda: gen_id("tmpl"))
    
    # Template details
    name = Column(String(200), nullable=False)
    description = Column(Text)
    template_type = Column(String(20), nullable=False)  # sms, email
    category = Column(String(50))  # appointment_reminder, payment_due, welcome, etc.
    # tenant_id is now inherited from TenantScopedMixin
    
    # Content
    subject = Column(String(500))  # For email templates
    body_text = Column(Text, nullable=False)  # Plain text version
    body_html = Column(Text)  # HTML version for emails
    
    # Template variables
    variables = Column(Text)  # JSON array of available variables
    
    # Settings
    is_active = Column(Boolean, default=True)
    is_system = Column(Boolean, default=False)  # System templates cannot be deleted
    
    # Usage tracking
    usage_count = Column(Integer, default=0)
    last_used_at = Column(DateTime)

    @property
    def variables_json(self):
        return self.json_load(self.variables) or []
    
    @variables_json.setter
    def variables_json(self, value):
        self.variables = self.json_dump(value or [])

    def to_dict(self):
        base_dict = self.to_dict_base()
        template_dict = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'templateType': self.template_type,
            'category': self.category,
            'subject': self.subject,
            'bodyText': self.body_text,
            'bodyHtml': self.body_html,
            'variables': self.variables_json,
            'isActive': self.is_active,
            'isSystem': self.is_system,
            'usageCount': self.usage_count,
            'lastUsedAt': self.last_used_at.isoformat() if self.last_used_at else None
        }
        template_dict.update(base_dict)
        return template_dict

    def increment_usage(self):
        """Increment usage count and update last used timestamp"""
        self.usage_count = (self.usage_count or 0) + 1
        self.last_used_at = datetime.now(timezone.utc)

    # Index suggestions
    __table_args__ = (
        Index('ix_template_type', 'template_type'),
        Index('ix_template_category', 'category'),
        Index('ix_template_active', 'is_active'),
        Index('ix_template_system', 'is_system'),
    )


class CommunicationHistory(BaseModel, JSONMixin, TenantScopedMixin):
    """Unified communication history model"""
    __tablename__ = 'communication_history'

    # Primary key with auto-generated default
    id = Column(String(50), primary_key=True, default=lambda: gen_id("comm"))
    
    # Foreign keys
    party_id = Column(String(50), ForeignKey('parties.id'), nullable=False)
    campaign_id = Column(String(50), ForeignKey('campaigns.id'), nullable=True)
    template_id = Column(String(50), ForeignKey('communication_templates.id'), nullable=True)
    # tenant_id is now inherited from TenantScopedMixin
    
    # Reference to specific communication log
    sms_log_id = Column(String(50), ForeignKey('sms_logs.id'), nullable=True)
    email_log_id = Column(String(50), ForeignKey('email_logs.id'), nullable=True)
    
    # Communication details
    communication_type = Column(String(20), nullable=False)  # sms, email, call, in_person
    direction = Column(String(10), nullable=False)  # inbound, outbound
    subject = Column(String(500))
    content = Column(Text)
    
    # Contact information
    contact_method = Column(String(255))  # phone number, email address, etc.
    
    # Status and metadata
    status = Column(String(20), default='completed')  # pending, completed, failed
    priority = Column(String(20), default='normal')  # low, normal, high, urgent
    
    # Additional data
    comm_metadata = Column(Text)  # JSON for additional data
    
    # User who initiated (for manual communications)
    initiated_by = Column(String(50))  # user_id

    # Relationships
    party = relationship('Party', backref='communication_history', lazy=True)
    sms_log = relationship('SmsLog', backref='communication_history', lazy=True)
    email_log = relationship('EmailLog', backref='communication_history', lazy=True)
    template = relationship('CommunicationTemplate', backref='communication_history', lazy=True)

    @property
    def metadata_json(self):
        return self.json_load(self.comm_metadata) or {}
    
    @metadata_json.setter
    def metadata_json(self, value):
        self.comm_metadata = self.json_dump(value or {})

    def to_dict(self):
        base_dict = self.to_dict_base()
        history_dict = {
            'id': self.id,
            'partyId': self.party_id,
            'campaignId': self.campaign_id,
            'templateId': self.template_id,
            'smsLogId': self.sms_log_id,
            'emailLogId': self.email_log_id,
            'communicationType': self.communication_type,
            'direction': self.direction,
            'subject': self.subject,
            'content': self.content,
            'contactMethod': self.contact_method,
            'status': self.status,
            'priority': self.priority,
            'metadata': self.metadata_json,
            'initiatedBy': self.initiated_by
        }
        history_dict.update(base_dict)
        return history_dict

    # Index suggestions
    __table_args__ = (
        Index('ix_comm_history_patient', 'party_id'),
        Index('ix_comm_history_type', 'communication_type'),
        Index('ix_comm_history_direction', 'direction'),
        Index('ix_comm_history_status', 'status'),
        Index('ix_comm_history_created', 'created_at'),
    )

Communication = CommunicationHistory