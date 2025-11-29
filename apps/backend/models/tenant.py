"""
Simplified Tenant model for multi-tenant architecture
"""
import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, String, Boolean, DateTime, Text, JSON
from models.base import db


class TenantStatus(str, Enum):
    """Tenant status enumeration"""
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"
    TRIAL = "trial"


class Tenant(db.Model):
    """Tenant model for managing customer organizations"""
    
    __tablename__ = 'tenants'
    
    # Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Basic information
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    
    # Contact information
    owner_email = Column(String(255), nullable=False)
    billing_email = Column(String(255), nullable=False)
    
    # Status
    status = Column(String(20), default=TenantStatus.TRIAL.value, nullable=False, index=True)
    
    # Plan and limits
    current_plan = Column(String(50), nullable=True)  # Plan name/slug (Legacy, keep for backward compat)
    current_plan_id = Column(String(36), nullable=True) # ID of the Plan
    subscription_start_date = Column(DateTime, nullable=True)
    subscription_end_date = Column(DateTime, nullable=True)
    feature_usage = Column(JSON, nullable=True, default={}) # Track usage of limited features
    
    max_users = Column(db.Integer, default=5)
    current_users = Column(db.Integer, default=0)
    
    # Additional information
    company_info = Column(JSON, nullable=True)
    settings = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    
    # Indexes
    __table_args__ = (
        db.Index('idx_tenants_status', 'status'),
        db.Index('idx_tenants_slug', 'slug'),
    )
    
    @staticmethod
    def generate_slug(name: str) -> str:
        """Generate URL-friendly slug"""
        import re
        slug = re.sub(r'[^\w\s-]', '', name.lower())
        slug = re.sub(r'[-\s]+', '-', slug)
        return slug.strip('-')
    
    def is_active(self) -> bool:
        return self.status == TenantStatus.ACTIVE.value and not self.deleted_at
    
    def soft_delete(self):
        self.deleted_at = datetime.utcnow()
        self.status = TenantStatus.CANCELLED.value
    
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'owner_email': self.owner_email,
            'billing_email': self.billing_email,
            'status': self.status,
            'current_plan': self.current_plan,
            'current_plan_id': self.current_plan_id,
            'subscription_start_date': self.subscription_start_date.isoformat() if self.subscription_start_date else None,
            'subscription_end_date': self.subscription_end_date.isoformat() if self.subscription_end_date else None,
            'feature_usage': self.feature_usage,
            'max_users': self.max_users,
            'current_users': self.current_users,
            'company_info': self.company_info,
            'settings': self.settings,
            'is_active': self.is_active(),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None
        }
    
    def __repr__(self):
        return f'<Tenant {self.name} ({self.status})>'