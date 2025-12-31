from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from .base import Base
from sqlalchemy.orm import validates
import re


class AffiliateUser(Base):
    __tablename__ = 'affiliate_user'

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    iban = Column(String(34), nullable=True)
    # Unique short code for referrals
    code = Column(String(32), unique=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    @validates('iban')
    def validate_iban(self, key, iban):
        # If no IBAN provided, skip validation
        if not iban:
            return None
        # IBAN validation (basic, can be extended)
        iban = iban.replace(' ', '').upper()
        if not re.match(r'^[A-Z0-9]{15,34}$', iban):
            raise ValueError('Invalid IBAN format')
        # Move first 4 chars to end and convert letters to numbers
        rearranged = iban[4:] + iban[:4]
        numerized = ''.join(str(int(ch, 36)) if ch.isalpha() else ch for ch in rearranged)
        if int(numerized) % 97 != 1:
            raise ValueError('Invalid IBAN checksum')
        return iban
