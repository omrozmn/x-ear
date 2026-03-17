"""
AddOn model for additional features/packages
"""
from core.models.base import Base
import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, Boolean, DateTime, Text, Numeric, Integer, Index, Enum as SQLEnum, ForeignKey

class AddOnType(PyEnum):
    """AddOn type enumeration"""
    PER_USER = "PER_USER"
    FLAT_FEE = "FLAT_FEE"
    USAGE_BASED = "USAGE_BASED"
    FEATURE = "FEATURE"

class AddOn(Base):
    """AddOn model for additional features"""
    __tablename__ = 'addons'

    __table_args__ = (
        Index('idx_addons_sector', 'sector'),
        Index('idx_addons_country_code', 'country_code'),
        Index('idx_addons_sector_country', 'sector', 'country_code'),
    )
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    
    addon_type = Column(SQLEnum(AddOnType), nullable=False, default=AddOnType.FLAT_FEE)
    price = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default='TRY', nullable=False)
    
    # For usage based or limits
    unit_name = Column(String(50), nullable=True) # e.g. "SMS", "GB"
    limit_amount = Column(Integer, nullable=True) # e.g. 1000 SMS

    # Sector & Country scoping
    sector = Column(String(30), nullable=True, index=True)  # hearing, pharmacy, hospital, etc.
    country_code = Column(String(2), ForeignKey('countries.code'), nullable=True, index=True)  # ISO 3166-1 alpha-2

    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'addon_type': self.addon_type.value,
            'price': float(self.price),
            'currency': self.currency,
            'unit_name': self.unit_name,
            'limit_amount': self.limit_amount,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
