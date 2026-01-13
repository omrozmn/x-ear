from sqlalchemy.orm import Session
from models.affiliate_user import AffiliateUser
from models.commission_ledger import CommissionLedger
from passlib.hash import pbkdf2_sha256
from typing import Optional, List
import re

class AffiliateService:

    @staticmethod
    def create_affiliate(db: Session, email: str, password: str, iban: Optional[str] = None, account_holder_name: Optional[str] = None, phone_number: Optional[str] = None) -> AffiliateUser:
        # IBAN is optional at registration; validate only if provided
        if iban:
            iban = iban.replace(' ', '').upper()
            if not re.match(r'^[A-Z0-9]{15,34}$', iban):
                raise ValueError('Geçersiz IBAN formatı')
            # Checksum validation (simplified) - relying on model for full check
        
        password_hash = pbkdf2_sha256.hash(password)
        # generate a short unique code for referral tracking
        import uuid
        code = uuid.uuid4().hex[:8]
        # ensure uniqueness (simple loop)
        while db.query(AffiliateUser).filter_by(code=code).first():
            code = uuid.uuid4().hex[:8]
        affiliate = AffiliateUser(
            email=email, 
            password_hash=password_hash, 
            iban=iban, 
            code=code,
            account_holder_name=account_holder_name,
            phone_number=phone_number
        )
        db.add(affiliate)
        db.commit()
        db.refresh(affiliate)
        return affiliate

    @staticmethod
    def authenticate(db: Session, email: str, password: str) -> Optional[AffiliateUser]:
        user = db.query(AffiliateUser).filter_by(email=email).first()
        if user and pbkdf2_sha256.verify(password, user.password_hash):
            return user
        return None

    @staticmethod
    def get_affiliate_by_code(db: Session, code: str) -> Optional[AffiliateUser]:
        return db.query(AffiliateUser).filter_by(code=code).first()

    @staticmethod
    def get_affiliate_by_id(db: Session, affiliate_id: int) -> Optional[AffiliateUser]:
        return db.query(AffiliateUser).filter_by(id=affiliate_id).first()

    @staticmethod
    def update_payment_info(db: Session, affiliate_id: int, iban: str, account_holder_name: Optional[str] = None, phone_number: Optional[str] = None) -> AffiliateUser:
        user = db.query(AffiliateUser).filter_by(id=affiliate_id).first()
        if not user:
            raise ValueError('Affiliate kullanıcı bulunamadı')
        
        # IBAN validation
        if iban:
            iban = iban.replace(' ', '').upper()
            if not re.match(r'^[A-Z0-9]{15,34}$', iban):
                raise ValueError('Geçersiz IBAN formatı')
            user.iban = iban
            
        if account_holder_name:
            user.account_holder_name = account_holder_name
        
        if phone_number:
            user.phone_number = phone_number
            
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def list_affiliates(db: Session, skip: int = 0, limit: int = 100):
        return db.query(AffiliateUser).offset(skip).limit(limit).all()

    @staticmethod
    def get_commissions(db: Session, affiliate_id: int) -> List[CommissionLedger]:
        return db.query(CommissionLedger).filter_by(affiliate_id=affiliate_id).order_by(CommissionLedger.created_at.desc()).all()
