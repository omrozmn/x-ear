from sqlalchemy.orm import Session
from models.affiliate_user import AffiliateUser
from passlib.hash import bcrypt
from typing import Optional
import re

class AffiliateService:
    @staticmethod
    def create_affiliate(db: Session, email: str, password: str, iban: str | None = None) -> AffiliateUser:
        # IBAN is optional at registration; validate only if provided
        if iban:
            iban = iban.replace(' ', '').upper()
            if not re.match(r'^[A-Z0-9]{15,34}$', iban):
                raise ValueError('Invalid IBAN format')
        password_hash = bcrypt.hash(password)
        # generate a short unique code for referral tracking
        import uuid
        code = uuid.uuid4().hex[:8]
        # ensure uniqueness (simple loop)
        while db.query(AffiliateUser).filter_by(code=code).first():
            code = uuid.uuid4().hex[:8]
        affiliate = AffiliateUser(email=email, password_hash=password_hash, iban=iban, code=code)
        db.add(affiliate)
        db.commit()
        db.refresh(affiliate)
        return affiliate

    @staticmethod
    def authenticate(db: Session, email: str, password: str) -> Optional[AffiliateUser]:
        user = db.query(AffiliateUser).filter_by(email=email).first()
        if user and bcrypt.verify(password, user.password_hash):
            return user
        return None

    @staticmethod
    def get_affiliate_by_code(db: Session, code: str) -> Optional[AffiliateUser]:
        return db.query(AffiliateUser).filter_by(code=code).first()

    @staticmethod
    def get_affiliate_by_id(db: Session, affiliate_id: int) -> Optional[AffiliateUser]:
        return db.query(AffiliateUser).filter_by(id=affiliate_id).first()

    @staticmethod
    def update_iban(db: Session, affiliate_id: int, iban: str) -> AffiliateUser:
        user = db.query(AffiliateUser).filter_by(id=affiliate_id).first()
        if not user:
            raise ValueError('Affiliate not found')
        iban = iban.replace(' ', '').upper()
        import re
        if not re.match(r'^[A-Z0-9]{15,34}$', iban):
            raise ValueError('Invalid IBAN format')
        user.iban = iban
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def list_affiliates(db: Session, skip: int = 0, limit: int = 100):
        return db.query(AffiliateUser).offset(skip).limit(limit).all()
