import os
import logging
from uuid import uuid4
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from core.database import unbound_session
from core.models.tenant import Tenant, TenantStatus
from models.user import User
from schemas.base import ResponseEnvelope
from schemas.tenants import TurnstileConfigResponse, RegistrationVerifyResponse
from routers.auth import create_access_token
from services.otp_store import get_store
from services.sms_service import VatanSMSService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Registration"])


def _is_nonprod_otp_env() -> bool:
    return os.getenv('ENVIRONMENT', 'production').lower() in {'development', 'test', 'testing'}


def _generate_registration_otp() -> str:
    import random
    if _is_nonprod_otp_env():
        code = str(random.randint(100000, 999999))
        logger.info(f"[DEV] Generated registration OTP: {code}")
        return code
    return str(random.randint(100000, 999999))


def _should_skip_external_sms() -> bool:
    if not _is_nonprod_otp_env():
        return False
    return os.getenv('ENABLE_REAL_SMS_IN_TESTS', 'false').lower() not in {'1', 'true', 'yes'}

def now_utc():
    """Return current UTC timestamp"""
    return datetime.now(timezone.utc)

def _short_id(length: int = 6) -> str:
    """Generate a short hex id from uuid4"""
    full_hex: str = uuid4().hex  # type: ignore[index]
    result = ""
    for i in range(min(length, len(full_hex))):
        result += full_hex[i]
    return result

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
    product_code: Optional[str] = None

# --- Helper Functions ---

def normalize_phone(phone: str) -> str:
    """Strip spaces and common separators to ensure consistency"""
    if not phone:
        return ""
    # Keep digits and '+'
    return "".join(c for c in phone if c.isdigit() or c == '+')


def get_otp_store():
    """Get OTP store instance"""
    return get_store()

# --- Routes ---

@router.get("/config/turnstile", operation_id="listConfigTurnstile", response_model=ResponseEnvelope[TurnstileConfigResponse])
def get_turnstile_config():
    """Get Turnstile configuration"""
    site_key = os.getenv('TURNSTILE_SITE_KEY')
    return ResponseEnvelope(data=TurnstileConfigResponse(site_key=site_key or ''))

@router.post("/register-phone", operation_id="createRegisterPhone")
def register_phone(
    request_data: RegisterPhoneRequest,
    db: Session = Depends(get_db)
):
    """Register phone and send OTP"""
    try:
        phone = normalize_phone(request_data.phone)
        if not phone:
            raise HTTPException(status_code=400, detail="Phone required")
        
        # Generate OTP
        code = _generate_registration_otp()
        
        logger.info(f"Generating OTP for {phone}: {code}")
        
        otp_store = get_otp_store()
        otp_store.set_otp(phone, code, ttl=300)
        
        # Send SMS via VatanSMS
        if _should_skip_external_sms():
            logger.info("Skipping external registration SMS in non-production OTP env")
        else:
            try:
                api_id = os.getenv('VATANSMS_USERNAME') or os.getenv('VATAN_API_ID')
                api_key = os.getenv('VATANSMS_PASSWORD') or os.getenv('VATAN_API_KEY')
                sender = os.getenv('VATANSMS_SENDER') or os.getenv('VATAN_SENDER', 'OZMN TIBCHZ')
                
                if not api_id or not api_key:
                    raise RuntimeError(
                        "SMS credentials not configured. Set VATANSMS_USERNAME and VATANSMS_PASSWORD environment variables."
                    )
                
                if api_id and api_key:
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

@router.post("/verify-registration-otp", operation_id="createVerifyRegistrationOtp", status_code=201, response_model=ResponseEnvelope[RegistrationVerifyResponse])
def verify_registration_otp(
    request_data: VerifyRegistrationOTPRequest,
    db: Session = Depends(get_db)
):
    """Verify OTP and create/get user"""
    try:
        
        phone = normalize_phone(request_data.phone)
        otp = str(request_data.otp or request_data.otp_code or '')
        
        if not phone or not otp:
            raise HTTPException(status_code=400, detail="Phone and OTP required")
        
        otp_store = get_otp_store()
        stored = otp_store.get_otp(phone)
        
        logger.info(f"Verifying OTP for {phone}: received='{otp}', stored='{stored}'")
        
        if not stored:
            raise HTTPException(status_code=400, detail="OTP kodu geçersiz veya süresi dolmuş.")
        
        if otp != stored:
            raise HTTPException(status_code=400, detail="OTP kodunu yanlış girdiniz, lütfen kontrol edin.")

        
        # Create or get user
        username = phone
        with unbound_session(reason="registration-user-lookup"):
            existing_user = db.query(User).filter_by(username=username).first()
        
        # Generation of secure temporary strings
        now_str = datetime.now().strftime('%d%m%Y%H%M%S')
        temp_password = f"temp_{now_str}_{_short_id(6)}"
        
        if not existing_user:
            
            # 1. Create Tenant first
            tenant_name = f"{request_data.first_name or 'Yeni'} {request_data.last_name or 'Kullanıcı'}"
            new_tenant = Tenant()
            new_tenant.id = str(uuid4())
            new_tenant.name = tenant_name
            
            # Process Referral Code
            affiliate_id = None
            if request_data.referral_code:
                from models.affiliate_user import AffiliateUser
                affiliate = db.query(AffiliateUser).filter_by(code=request_data.referral_code).first()
                if affiliate and affiliate.is_active:
                    affiliate_id = affiliate.id

            # Sector-aware slug prefix
            _product_code = request_data.product_code or "xear_hearing"
            _slug_prefixes = {
                "xear_hearing": "clinic",
                "xear_pharmacy": "pharmacy",
                "xear_optic": "optic",
                "xear_medical": "medco",
                "xear_hospital": "hospital",
                "xear_hotel": "hotel",
                "xear_beauty": "beauty",
                "xear_general": "biz",
            }
            _slug_prefix = _slug_prefixes.get(_product_code, "biz")
            new_tenant.slug = f"{_slug_prefix}-{_short_id(8)}"
            new_tenant.billing_email = f"{phone}@mobile-signup.x-ear.com"
            new_tenant.status = TenantStatus.TRIAL.value

            # Set product_code and sector
            new_tenant.product_code = _product_code
            _sector_map = {
                "xear_hearing": "hearing",
                "xear_pharmacy": "pharmacy",
                "xear_optic": "optic",
                "xear_medical": "medical",
                "xear_hospital": "hospital",
                "xear_hotel": "hotel",
                "xear_beauty": "beauty",
                "xear_general": "general",
            }
            new_tenant.sector = _sector_map.get(_product_code, "general")

            if affiliate_id:
                new_tenant.affiliate_id = affiliate_id
                new_tenant.referral_code = request_data.referral_code
            
            db.add(new_tenant)
            db.flush() # Get ID before committing
            
            u = User()
            u.id = f"user_{now_str}_{_short_id(6)}"
            u.username = username
            u.email = f"{phone}@mobile-signup.x-ear.com"
            u.phone = phone
            u.first_name = request_data.first_name
            u.last_name = request_data.last_name
            u.tenant_id = new_tenant.id
            u.role = 'tenant_admin'
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
        
        return ResponseEnvelope(data=RegistrationVerifyResponse(
            user_id=user_id,
            username=username_saved,
            temp_password=temp_password,
            access_token=access_token,
            message='Registration successful'
        ))
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Verify registration OTP error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
