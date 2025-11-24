"""
Plan model for subscription plans
"""

import uuid
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, String, Boolean, DateTime, Text, JSON, Numeric, Integer
from sqlalchemy.orm import relationship
from models.base import db


class PlanType(Enum):
    """Plan type enumeration"""
    BASIC = "BASIC"
    PRO = "PRO"
    ENTERPRISE = "ENTERPRISE"
    CUSTOM = "CUSTOM"


class BillingInterval(Enum):
    """Billing interval enumeration"""
    MONTHLY = "MONTHLY"
    YEARLY = "YEARLY"
    QUARTERLY = "QUARTERLY"


class Plan(db.Model):
    """Plan model for subscription plans"""
    
    __tablename__ = 'plans'
    
    # Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Basic information
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    
    # Plan type and pricing
    plan_type = Column(db.Enum(PlanType), nullable=False, index=True)
    price = Column(Numeric(10, 2), nullable=False)
    billing_interval = Column(db.Enum(BillingInterval), default=BillingInterval.MONTHLY, nullable=False)
    
    # Features and limits
    features = Column(JSON, nullable=True)  # Feature list and limits
    max_users = Column(Integer, nullable=True)  # null = unlimited
    max_storage_gb = Column(Integer, nullable=True)  # null = unlimited
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    is_public = Column(Boolean, default=True, nullable=False)  # Public or private plan
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    # memberships = relationship("Membership", back_populates="plan", lazy='dynamic')  # TODO: Add when Membership model is created
    
    # Indexes
    __table_args__ = (
        db.Index('idx_plans_name', 'name'),
        db.Index('idx_plans_slug', 'slug'),
        db.Index('idx_plans_plan_type', 'plan_type'),
        db.Index('idx_plans_is_active', 'is_active'),
        db.Index('idx_plans_is_public', 'is_public'),
    )
    
    def __init__(self, **kwargs):
        """Initialize Plan"""
        super().__init__(**kwargs)
        
        # Generate slug from name if not provided
        if not self.slug and self.name:
            self.slug = self.generate_slug(self.name)
    
    @staticmethod
    def generate_slug(name: str) -> str:
        """Generate URL-friendly slug from name"""
        import re
        slug = re.sub(r'[^\w\s-]', '', name.lower())
        slug = re.sub(r'[-\s]+', '-', slug)
        return slug.strip('-')
    
    def get_monthly_price(self) -> float:
        """Get monthly equivalent price"""
        if self.billing_interval == BillingInterval.MONTHLY:
            return float(self.price)
        elif self.billing_interval == BillingInterval.QUARTERLY:
            return float(self.price) / 3
        elif self.billing_interval == BillingInterval.YEARLY:
            return float(self.price) / 12
        return float(self.price)
    
    def get_yearly_price(self) -> float:
        """Get yearly equivalent price"""
        return self.get_monthly_price() * 12
    
    def has_feature(self, feature_name: str) -> bool:
        """Check if plan has specific feature"""
        if not self.features:
            return False
        return feature_name in self.features
    
    def get_feature_limit(self, feature_name: str) -> int:
        """Get feature limit (0 = unlimited)"""
        if not self.features or feature_name not in self.features:
            return 0
        
        feature = self.features[feature_name]
        if isinstance(feature, dict):
            return feature.get('limit', 0)
        return 0
    
    def to_dict(self, include_relationships=False) -> dict:
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'plan_type': self.plan_type.value,
            'price': float(self.price),
            'billing_interval': self.billing_interval.value,
            'features': self.features,
            'max_users': self.max_users,
            'max_storage_gb': self.max_storage_gb,
            'is_active': self.is_active,
            'is_public': self.is_public,
            'monthly_price': self.get_monthly_price(),
            'yearly_price': self.get_yearly_price(),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        
        # if include_relationships:
        #     data['active_memberships_count'] = self.memberships.filter_by(status='ACTIVE').count()
        
        return data
    
    def __repr__(self):
        return f'<Plan {self.name} ({self.plan_type.value})>'