# Campaign and SMS Models
from .base import db, BaseModel, gen_id, JSONMixin
import json

class Campaign(BaseModel, JSONMixin):
    __tablename__ = 'campaigns'

    # Primary key with auto-generated default
    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id("camp"))
    
    # Campaign details
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    campaign_type = db.Column(db.String(50), default='sms')  # sms, email, notification
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=False, index=True)
    
    # Target audience
    target_segment = db.Column(db.String(50))  # lead, customer, trial, etc.
    target_criteria = db.Column(db.Text)  # JSON for complex filtering
    
    # Content
    message_template = db.Column(db.Text, nullable=False)
    subject = db.Column(db.String(200))  # For email campaigns
    
    # Scheduling
    scheduled_at = db.Column(db.DateTime)
    sent_at = db.Column(db.DateTime)
    
    # Status and metrics
    status = db.Column(db.String(20), default='draft')  # draft, scheduled, sending, sent, cancelled
    total_recipients = db.Column(db.Integer, default=0)
    successful_sends = db.Column(db.Integer, default=0)
    failed_sends = db.Column(db.Integer, default=0)
    
    # Cost tracking
    estimated_cost = db.Column(db.Float, default=0.0)
    actual_cost = db.Column(db.Float, default=0.0)

    @property
    def target_criteria_json(self):
        return self.json_load(self.target_criteria)
    
    @target_criteria_json.setter
    def target_criteria_json(self, value):
        self.target_criteria = self.json_dump(value)

    def to_dict(self):
        base_dict = self.to_dict_base()
        campaign_dict = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'campaignType': self.campaign_type,
            'targetSegment': self.target_segment,
            'targetCriteria': self.target_criteria_json,
            'messageTemplate': self.message_template,
            'subject': self.subject,
            'scheduledAt': self.scheduled_at.isoformat() if self.scheduled_at else None,
            'sentAt': self.sent_at.isoformat() if self.sent_at else None,
            'status': self.status,
            'totalRecipients': self.total_recipients,
            'successfulSends': self.successful_sends,
            'failedSends': self.failed_sends,
            'estimatedCost': float(self.estimated_cost) if self.estimated_cost else 0.0,
            'actualCost': float(self.actual_cost) if self.actual_cost else 0.0
        }
        campaign_dict.update(base_dict)
        return campaign_dict

class SMSLog(BaseModel, JSONMixin):
    __tablename__ = 'sms_logs'

    # Primary key with auto-generated default
    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id("sms"))
    
    # Foreign keys
    campaign_id = db.Column(db.String(50), db.ForeignKey('campaigns.id'), nullable=True)
    patient_id = db.Column(db.String(50), db.ForeignKey('patients.id'), nullable=True)
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=False, index=True)
    
    # SMS details
    phone_number = db.Column(db.String(20), nullable=False)
    message = db.Column(db.Text, nullable=False)
    
    # Status tracking
    status = db.Column(db.String(20), default='pending')  # pending, sent, delivered, failed
    provider_response = db.Column(db.Text)  # JSON string
    
    # Timestamps
    sent_at = db.Column(db.DateTime)
    delivered_at = db.Column(db.DateTime)
    opened_at = db.Column(db.DateTime)  # For tracking links
    clicked_at = db.Column(db.DateTime)  # For tracking links
    
    # Error handling
    error_message = db.Column(db.Text)
    retry_count = db.Column(db.Integer, default=0)
    
    # Cost tracking
    cost = db.Column(db.Float)

    # Relationships
    patient = db.relationship('Patient', backref='sms_logs', lazy=True)

    @property
    def provider_response_json(self):
        return self.json_load(self.provider_response)
    
    @provider_response_json.setter
    def provider_response_json(self, value):
        self.provider_response = self.json_dump(value)

    def to_dict(self):
        base_dict = self.to_dict_base()
        sms_dict = {
            'id': self.id,
            'campaignId': self.campaign_id,
            'patientId': self.patient_id,
            'phoneNumber': self.phone_number,
            'message': self.message,
            'status': self.status,
            'providerResponse': self.provider_response_json,
            'sentAt': self.sent_at.isoformat() if self.sent_at else None,
            'deliveredAt': self.delivered_at.isoformat() if self.delivered_at else None,
            'openedAt': self.opened_at.isoformat() if self.opened_at else None,
            'clickedAt': self.clicked_at.isoformat() if self.clicked_at else None,
            'errorMessage': self.error_message,
            'retryCount': self.retry_count,
            'cost': float(self.cost) if self.cost else None
        }
        sms_dict.update(base_dict)
        return sms_dict

    # Index suggestions
    __table_args__ = (
        db.Index('ix_sms_campaign', 'campaign_id'),
        db.Index('ix_sms_patient', 'patient_id'),
        db.Index('ix_sms_status', 'status'),
        db.Index('ix_sms_sent_at', 'sent_at'),
    )