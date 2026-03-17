from sqlalchemy import Column, Boolean, DateTime, Float, Integer, String, Index, ForeignKey
from core.models.base import Base
from datetime import datetime
import uuid

class SmsPackage(Base):
    __tablename__ = 'sms_packages'
    __table_args__ = (
        Index('idx_sms_packages_country_code', 'country_code'),
        {'extend_existing': True},
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    description = Column(String(500))
    sms_count = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    currency = Column(String(3), default='TRY')
    country_code = Column(String(2), ForeignKey('countries.code'), nullable=True, index=True)  # ISO 3166-1 alpha-2
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'sms_count': self.sms_count,
            'price': self.price,
            'currency': self.currency,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
