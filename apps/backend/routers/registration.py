"""
FastAPI Registration Router - Migrated from Flask routes/registration.py
Handles user registration with phone verification
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import os
import logging
from uuid import uuid4

from sqlalchemy.orm import Session

from database import get_db
from schemas.base import ResponseEnvelope
from routers.auth import create_access_token

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Registration"])

def now_utc():
    """Return current UTC timestamp"""
    return datetime.now(timezone.utc)

# --- Schemas ---

class RegisterPhoneRequest(BaseModel):
    phone: str
    captcha_token: Optional[str] = None

class VerifyRegistrationOTPRequest(BaseModel):
    phone: str
    otp: Optional[str] = None
    otp_code: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    referral_code: Optional[str] = None

# --- Helper Functions ---

def get_otp_store():
    """Get OTP store instance"""
    try:
        from services.otp_store import get_store
        return get_store()
    except Exception:
        from services.otp_store import InMemoryOTPStore
        return InMemoryOTPStore()

# --- Routes ---

@router.get("/config/turnstile", operation_id="listConfigTurnstile")
def get_turnstile_config():
    """Get Turnstile configuration"""
    site_key = os.getenv('TURNSTILE_SITE_KEY')
    return ResponseEnvelope(data={'siteKey': site_key or ''})

@router.post("/register-phone", operation_id="createRegisterPhone")
def register_phone(
    request_data: RegisterPhoneRequest,
    db: Session = Depends(get_db)
):
    """Register phone and send OTP"""
    try:
        phone = request_data.phone
        if not phone:
            raise HTTPException(status_code=400, detail="Phone required")
        
        # Generate OTP
        now_ts = int(now_utc().timestamp())
        code = str(100000 + (now_ts % 900000))
        
        otp_store = get_otp_store()
        otp_store.set_otp(phone, code, ttl=300)
        
        # Send SMS via VatanSMS
        try:
            api_id = os.getenv('VATANSMS_USERNAME') or os.getenv('VATAN_API_ID')
            api_key = os.getenv('VATANSMS_PASSWORD') or os.getenv('VATAN_API_KEY')
            sender = os.getenv('VATANSMS_SENDER') or os.getenv('VATAN_SENDER', 'OZMN TIBCHZ')
            
            # Fallbacks for dev
            if not api_id:
                api_id = '4ab531b6fd26fd9ba6010b0d'
            if not api_key:
                api_key = '49b2001edbb1789e4e62f935'
            
            if api_id and api_key:
                from services.sms_service import VatanSMSService
                sms_service = VatanSMSService(api_id, api_key, sender)
                
                clean_phone = phone.replace(' ', '').replace('+', '')
                sms_service.send_sms([clean_phone], f"X-Ear Doğrulama Kodunuz: {code}")
            else:
                raise HTTPException(
                    status_code=500,
                    detail="SMS Configuration Missing (VATANSMS_USERNAME/PASSWORD)"
                )
                
        except HTTPException:
            raise
        except Exception as sms_error:
            logger.error(f"Failed to send SMS: {sms_error}")
            raise HTTPException(status_code=500, detail=f"SMS gönderilemedi: {str(sms_error)}")
        
        return ResponseEnvelope(message='OTP generated and sent')
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Register phone error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify-registration-otp", operation_id="createVerifyRegistrationOtp", status_code=201)
def verify_registration_otp(
    request_data: VerifyRegistrationOTPRequest,
    db: Session = Depends(get_db)
):
    """Verify OTP and create/get user"""
    try:
        from models.user import User
        
        phone = request_data.phone
        otp = str(request_data.otp or request_data.otp_code or '')
        
        if not phone or not otp:
            raise HTTPException(status_code=400, detail="Phone and OTP required")
        
        otp_store = get_otp_store()
        stored = otp_store.get_otp(phone)
        
        if not stored:
            raise HTTPException(status_code=400, detail="OTP kodu geçersiz veya süresi dolmuş.")
        
        if otp != stored:
            raise HTTPException(status_code=400, detail="OTP kodunu yanlış girdiniz, lütfen kontrol edin.")
        
        # Create or get user
        username = phone
        existing_user = db.query(User).filter_by(username=username).first()
        temp_password = f"temp_{datetime.now().strftime('%d%m%Y%H%M%S')}_{uuid4().hex[:6]}"
        
        if not existing_user:
            u = User()
            u.id = f"user_{datetime.now().strftime('%d%m%Y%H%M%S')}_{uuid4().hex[:6]}"
            u.username = username
            u.email = f"{phone}@mobile-signup.x-ear.com"
            u.phone = phone
            u.first_name = request_data.first_name
            u.last_name = request_data.last_name
            if request_data.referral_code:
                u.affiliate_code = request_data.referral_code
            u.set_password(temp_password)
            db.add(u)
            db.commit()
            user_id = u.id
            username_saved = u.username
        else:
            # Update existing user
            if request_data.first_name:
                existing_user.first_name = request_data.first_name
            if request_data.last_name:
                existing_user.last_name = request_data.last_name
            if request_data.referral_code:
                existing_user.affiliate_code = request_data.referral_code
            
            db.commit()
            user_id = existing_user.id
            username_saved = existing_user.username
        
        # Issue JWT
        access_token = create_access_token(identity=user_id)
        
        # Clean OTP
        try:
            otp_store.delete_otp(phone)
        except Exception:
            pass
        
        return ResponseEnvelope(data={
            'user_id': user_id,
            'username': username_saved,
            'temp_password': temp_password,
            'access_token': access_token
        }, message='Registration successful')
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Verify registration OTP error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
