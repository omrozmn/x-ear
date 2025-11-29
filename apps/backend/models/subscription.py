"""
Subscription and Payment models for SaaS commerce
"""
import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Numeric, JSON
from sqlalchemy.orm import relationship
from models.base import db

class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    TRIALING = "trialing"
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"
    UNPAID = "unpaid"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELED = "canceled"
    REFUNDED = "refunded"

class Subscription(db.Model):
    """
    Represents a tenant's subscription to a plan.
    """
    __tablename__ = 'subscriptions'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey('tenants.id'), nullable=False, index=True)
    plan_id = Column(String(36), ForeignKey('plans.id'), nullable=False)
    
    # Stripe/Iyzico Subscription ID
    provider_subscription_id = Column(String(100), nullable=True, index=True)
    
    status = Column(String(20), default=SubscriptionStatus.TRIALING.value, nullable=False)
    
    current_period_start = Column(DateTime, nullable=False, default=datetime.utcnow)
    current_period_end = Column(DateTime, nullable=False)
    
    cancel_at_period_end = Column(Boolean, default=False)
    canceled_at = Column(DateTime, nullable=True)
    
    trial_start = Column(DateTime, nullable=True)
    trial_end = Column(DateTime, nullable=True)
    
    # Metadata for add-ons or custom configurations
    # Note: 'metadata' is a reserved attribute name on Declarative classes; map DB column 'metadata' to attribute 'metadata_json'
    metadata_json = Column('metadata', JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    tenant = relationship("Tenant", backref=db.backref("subscription", uselist=False))
    plan = relationship("Plan")
    payments = relationship("PaymentHistory", backref="subscription", lazy="dynamic")

    def to_dict(self):
        return {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'plan_id': self.plan_id,
            'status': self.status,
            'current_period_start': self.current_period_start.isoformat() if self.current_period_start else None,
            'current_period_end': self.current_period_end.isoformat() if self.current_period_end else None,
            'cancel_at_period_end': self.cancel_at_period_end,
            'trial_end': self.trial_end.isoformat() if self.trial_end else None,
            'plan': self.plan.to_dict() if self.plan else None
        }

class PaymentHistory(db.Model):
    """
    Tracks payments made by tenants for subscriptions.
    """
    __tablename__ = 'payment_history'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String(36), ForeignKey('tenants.id'), nullable=False, index=True)
    subscription_id = Column(String(36), ForeignKey('subscriptions.id'), nullable=True)
    
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="TRY", nullable=False)
    
    status = Column(String(20), default=PaymentStatus.PENDING.value, nullable=False)
    
    # Stripe/Iyzico Payment Intent / Charge ID
    provider_payment_id = Column(String(100), nullable=True, index=True)
    payment_method = Column(String(50), nullable=True) # credit_card, bank_transfer
    
    description = Column(String(255), nullable=True)
    invoice_url = Column(String(500), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    paid_at = Column(DateTime, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'amount': float(self.amount),
            'currency': self.currency,
            'status': self.status,
            'date': self.created_at.isoformat(),
            'description': self.description,
            'invoice_url': self.invoice_url
        }
