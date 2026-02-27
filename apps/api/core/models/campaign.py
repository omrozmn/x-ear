# Campaign and SMS Models
from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, JSON, String, Text, Time, Index
from sqlalchemy.orm import relationship
from core.models.base import Base
from .base import db, BaseModel, gen_id, JSONMixin
from .mixins import TenantScopedMixin
import json

class Campaign(BaseModel, JSONMixin, TenantScopedMixin):
    __tablename__ = 'campaigns'

    # Primary key with auto-generated default
    id = Column(String(50), primary_key=True, default=lambda: gen_id("camp"))
    
    # Campaign details
    name = Column(String(200), nullable=False)
    description = Column(Text)
    campaign_type = Column(String(50), default='sms')  # sms, email, notification
    # tenant_id is now inherited from TenantScopedMixin
    
    # Target audience
    target_segment = Column(String(50))  # lead, customer, trial, etc.
    target_criteria = Column(Text)  # JSON for complex filtering
    
    # Content
    message_template = Column(Text, nullable=False)
    subject = Column(String(200))  # For email campaigns
    
    # Scheduling
    scheduled_at = Column(DateTime)
    sent_at = Column(DateTime)
    
    # Status and metrics
    status = Column(String(20), default='draft')  # draft, scheduled, sending, sent, cancelled
    total_recipients = Column(Integer, default=0)
    successful_sends = Column(Integer, default=0)
    failed_sends = Column(Integer, default=0)
    
    # Cost tracking
    estimated_cost = Column(Float, default=0.0)
    actual_cost = Column(Float, default=0.0)

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

class SmsLog(BaseModel, JSONMixin, TenantScopedMixin):
    __tablename__ = 'sms_logs'

    # Primary key with auto-generated default
    id = Column(String(50), primary_key=True, default=lambda: gen_id("sms"))
    
    # Foreign keys
    campaign_id = Column(String(50), ForeignKey('campaigns.id'), nullable=True)
    party_id = Column(String(50), ForeignKey('parties.id'), nullable=True)
    # tenant_id is now inherited from TenantScopedMixin
    
    # SMS details
    phone_number = Column(String(20), nullable=False)
    message = Column(Text, nullable=False)
    
    # Status tracking
    status = Column(String(20), default='pending')  # pending, sent, delivered, failed
    provider_response = Column(Text)  # JSON string
    
    # Timestamps
    sent_at = Column(DateTime)
    delivered_at = Column(DateTime)
    opened_at = Column(DateTime)  # For tracking links
    clicked_at = Column(DateTime)  # For tracking links
    
    # Error handling
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    
    # Cost tracking
    cost = Column(Float)

    # Relationships
    party = relationship('Party', backref='sms_logs', lazy=True)

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
            'partyId': self.party_id,
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
        Index('ix_sms_campaign', 'campaign_id'),
        Index('ix_sms_patient', 'party_id'),
        Index('ix_sms_status', 'status'),
        Index('ix_sms_sent_at', 'sent_at'),
    )