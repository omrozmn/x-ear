"""
Country model for multi-country platform support
"""
from core.models.base import Base
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, DateTime, JSON


class Country(Base):
    """Country configuration for international support"""

    __tablename__ = 'countries'

    code = Column(String(2), primary_key=True)           # ISO 3166-1 alpha-2: TR, US, DE...
    name = Column(String(100), nullable=False)             # "Turkey"
    native_name = Column(String(100))                      # "Türkiye"
    enabled = Column(Boolean, default=False, nullable=False)
    creatable = Column(Boolean, default=False, nullable=False)  # Can new tenants be created?
    currency_code = Column(String(3), nullable=False)      # TRY, USD, EUR
    locale = Column(String(10), nullable=False)            # tr-TR, en-US
    timezone = Column(String(50), nullable=False)          # Europe/Istanbul
    phone_prefix = Column(String(5), nullable=False)       # +90, +1
    flag_emoji = Column(String(4))                         # 🇹🇷
    date_format = Column(String(20), default='DD.MM.YYYY')
    config = Column(JSON, default={})                      # Country-specific extra settings
    sort_order = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self) -> dict:
        return {
            'code': self.code,
            'name': self.name,
            'nativeName': self.native_name,
            'enabled': self.enabled,
            'creatable': self.creatable,
            'currencyCode': self.currency_code,
            'locale': self.locale,
            'timezone': self.timezone,
            'phonePrefix': self.phone_prefix,
            'flagEmoji': self.flag_emoji,
            'dateFormat': self.date_format,
            'config': self.config or {},
            'sortOrder': self.sort_order,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<Country {self.code} ({self.name})>'
