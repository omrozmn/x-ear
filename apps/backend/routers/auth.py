"""
FastAPI Auth Router - Migrated from Flask routes/auth.py
Handles login, logout, token refresh, OTP verification, password reset
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from typing import Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
import logging
import random

from sqlalchemy.orm import Session
from jose import jwt

from dependencies import get_db, SECRET_KEY, ALGORITHM, oauth2_scheme
from schemas.base import ResponseEnvelope, ApiError
from models.user import User
from models.admin_user import AdminUser
from models.base import db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Auth"])

# --- Request/Response Schemas ---

class LoginRequest(BaseModel):
    identifier: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str

class LookupPhoneRequest(BaseModel):
    identifier: str

class ForgotPasswordRequest(BaseModel):
    identifier: str
    captcha_token: str = Field(..., alias="captchaToken")

class VerifyOTPRequest(BaseModel):
    otp: str
    identifier: Optional[str] = None

class ResetPasswordRequest(BaseModel):
    identifier: str
    otp: str
    new_password: str = Field(..., alias="newPassword", min_length=6)

class SetPasswordRequest(BaseModel):
    password: str = Field(..., min_length=6)

class SendVerificationOTPRequest(BaseModel):
    phone: Optional[str] = None

# --- Helper Functions ---

def create_access_token(identity: str, additional_claims: dict = None, expires_delta: timedelta = None) -> str:
    """Create JWT access token"""
    if expires_delta is None:
        expires_delta = timedelta(hours=8)
    
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {
        "sub": identity,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        **(additional_claims or {})
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(identity: str, additional_claims: dict = None, expires_delta: timedelta = None) -> str:
    """Create JWT refresh token"""
    if expires_delta is None:
        expires_delta = timedelta(days=30)
    
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {
        "sub": identity,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
        **(additional_claims or {})
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_otp_store():
    """Get OTP store instance"""
    try:
        from app import app
        otp_store = app.extensions.get('otp_store')
        if otp_store:
            return otp_store
    except Exception:
        pass
    
    from services.otp_store import InMemoryOTPStore
    return InMemoryOTPStore()

# --- Routes ---

@router.post("/auth/lookup-phone")
def lookup_phone(
    request_data: LookupPhoneRequest,
    db_session: Session = Depends(get_db)
):
    """Lookup user by identifier and return masked phone"""
    try:
        identifier = request_data.identifier
        
        from utils.tenant_security import UnboundSession
        with UnboundSession():
            user = User.query.filter_by(username=identifier).first()
            if not user:
                user = User.query.filter_by(email=identifier).first()
            if not user:
                user = User.query.filter_by(phone=identifier).first()
        
        if not user or not user.phone:
            raise HTTPException(
                status_code=404,
                detail=ApiError(
                    message="User not found or no phone registered",
                    code="USER_NOT_FOUND"
                ).model_dump(mode="json")
            )
        
        phone = user.phone
        masked = '*' * (len(phone) - 4) + phone[-4:] if len(phone) > 4 else phone
        
        return ResponseEnvelope(
            data={
                "maskedPhone": masked,
                "isPhoneInput": identifier == user.phone
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Lookup phone error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth/forgot-password")
def forgot_password(
    request_data: ForgotPasswordRequest,
    db_session: Session = Depends(get_db)
):
    """Send OTP for password reset"""
    try:
        identifier = request_data.identifier
        
        from utils.tenant_security import UnboundSession
        with UnboundSession():
            user = User.query.filter_by(phone=identifier).first()
            if not user:
                raise HTTPException(
                    status_code=404,
                    detail=ApiError(
                        message="User not found with this phone number",
                        code="USER_NOT_FOUND"
                    ).model_dump(mode="json")
                )
        
        otp_store = get_otp_store()
        code = str(random.randint(100000, 999999))
        otp_store.set_otp(identifier, code, ttl=300)
        
        # Send SMS
        from services.communication_service import communication_service
        msg = f"X-EAR sifre sifirlama kodunuz: {code}. Bu kodu kimseyle paylasmayiniz."
        result = communication_service.send_sms(identifier, msg)
        
        if not result.get('success'):
            logger.error(f"Failed to send SMS: {result}")
            raise HTTPException(
                status_code=500,
                detail=ApiError(
                    message=result.get('error', 'Failed to send SMS'),
                    code="SMS_FAILED",
                    details=result
                ).model_dump(mode="json")
            )
        
        return ResponseEnvelope(message="OTP sent to your phone")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Forgot password error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth/verify-otp")
def verify_otp(
    request_data: VerifyOTPRequest,
    authorization: Optional[str] = None,
    db_session: Session = Depends(get_db)
):
    """Verify OTP for phone verification or password reset"""
    try:
        otp = request_data.otp
        identifier = request_data.identifier
        user_id = None
        
        # Try to get user_id from token if provided
        if authorization and authorization.startswith("Bearer "):
            try:
                token = authorization.split(" ")[1]
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                user_id = payload.get("sub")
            except Exception:
                pass
        
        target_id = user_id if user_id else identifier
        
        if not target_id or not otp:
            raise HTTPException(
                status_code=400,
                detail=ApiError(
                    message="Identifier/Token and OTP required",
                    code="MISSING_PARAMS"
                ).model_dump(mode="json")
            )
        
        otp_store = get_otp_store()
        stored = otp_store.get_otp(target_id)
        
        if not stored:
            raise HTTPException(
                status_code=400,
                detail=ApiError(
                    message="Invalid or expired OTP",
                    code="OTP_EXPIRED"
                ).model_dump(mode="json")
            )
        
        if str(otp) != str(stored):
            raise HTTPException(
                status_code=400,
                detail=ApiError(
                    message="Invalid OTP",
                    code="OTP_INVALID"
                ).model_dump(mode="json")
            )
        
        # If authenticated, mark as verified and return full tokens
        if user_id:
            otp_store.delete_otp(target_id)
            user = db_session.get(User, user_id)
            
            if user:
                user.is_phone_verified = True
                user.last_login = datetime.now(timezone.utc)
                db_session.commit()
                
                access_token = create_access_token(
                    identity=user.id,
                    additional_claims={'tenant_id': user.tenant_id, 'role': user.role}
                )
                refresh_token = create_refresh_token(
                    identity=user.id,
                    additional_claims={'tenant_id': user.tenant_id, 'role': user.role}
                )
                
                return ResponseEnvelope(
                    data={
                        "accessToken": access_token,
                        "refreshToken": refresh_token,
                        "user": user.to_dict()
                    },
                    message="OTP verified"
                )
        
        return ResponseEnvelope(message="OTP verified")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verify OTP error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth/reset-password")
def reset_password(
    request_data: ResetPasswordRequest,
    db_session: Session = Depends(get_db)
):
    """Reset password using verified OTP"""
    try:
        identifier = request_data.identifier
        otp = request_data.otp
        new_password = request_data.new_password
        
        otp_store = get_otp_store()
        stored = otp_store.get_otp(identifier)
        
        if not stored:
            raise HTTPException(
                status_code=400,
                detail=ApiError(
                    message="Invalid or expired OTP",
                    code="OTP_EXPIRED"
                ).model_dump(mode="json")
            )
        
        if str(otp) != str(stored):
            raise HTTPException(
                status_code=400,
                detail=ApiError(
                    message="Invalid OTP",
                    code="OTP_INVALID"
                ).model_dump(mode="json")
            )
        
        from utils.tenant_security import UnboundSession
        with UnboundSession():
            user = User.query.filter_by(phone=identifier).first()
            if not user:
                raise HTTPException(
                    status_code=404,
                    detail=ApiError(
                        message="User not found",
                        code="USER_NOT_FOUND"
                    ).model_dump(mode="json")
                )
        
        user.set_password(new_password)
        user.last_login = datetime.now(timezone.utc)
        db_session.commit()
        
        otp_store.delete_otp(identifier)
        
        # Log activity
        try:
            from utils.activity_logging import log_activity
            log_activity(user.id, user.tenant_id, 'password_reset', 'Password reset via SMS OTP')
        except Exception as e:
            logger.warning(f"Failed to log password reset activity: {e}")
        
        return ResponseEnvelope(message="Password reset successfully")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth/login")
def login(
    request_data: LoginRequest,
    db_session: Session = Depends(get_db)
):
    """Login with username/email/phone and password"""
    try:
        identifier = (
            request_data.identifier or 
            request_data.username or 
            request_data.email or 
            request_data.phone
        )
        password = request_data.password
        
        logger.info(f"Login attempt - identifier: {identifier}")
        
        if not identifier or not password:
            raise HTTPException(
                status_code=400,
                detail=ApiError(
                    message="Username/email/phone and password required",
                    code="MISSING_CREDENTIALS"
                ).model_dump(mode="json")
            )
        
        from utils.tenant_security import UnboundSession
        with UnboundSession():
            user = User.query.filter_by(username=identifier).first()
            if not user:
                user = User.query.filter_by(email=identifier).first()
            if not user:
                user = User.query.filter_by(phone=identifier).first()
        
        if not user or not user.check_password(password):
            try:
                from utils.activity_logging import log_login
                log_login(identifier, None, success=False)
            except Exception as e:
                logger.warning(f"Failed to log failed login: {e}")
            
            raise HTTPException(
                status_code=401,
                detail=ApiError(
                    message="Invalid credentials",
                    code="INVALID_CREDENTIALS"
                ).model_dump(mode="json")
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=401,
                detail=ApiError(
                    message="Account is inactive",
                    code="ACCOUNT_INACTIVE"
                ).model_dump(mode="json")
            )
        
        # Send OTP if phone not verified
        if not user.is_phone_verified and user.phone:
            otp_store = get_otp_store()
            code = str(random.randint(100000, 999999))
            otp_store.set_otp(user.id, code, ttl=300)
            
            from services.communication_service import communication_service
            msg = f"X-EAR dogrulama kodunuz: {code}. Bu kodu kimseyle paylasmayiniz."
            communication_service.send_sms(user.phone, msg)
        
        # Update last login
        try:
            user.last_login = datetime.now(timezone.utc)
            db_session.add(user)
            db_session.commit()
        except Exception:
            db_session.rollback()
        
        # Log successful login
        try:
            from utils.activity_logging import log_login
            log_login(user.id, user.tenant_id, success=True)
        except Exception as e:
            logger.warning(f"Failed to log login activity: {e}")
        
        access_token = create_access_token(
            identity=user.id,
            additional_claims={'tenant_id': user.tenant_id, 'role': user.role}
        )
        refresh_token = create_refresh_token(
            identity=user.id,
            additional_claims={'tenant_id': user.tenant_id, 'role': user.role}
        )
        
        return ResponseEnvelope(
            data={
                "accessToken": access_token,
                "refreshToken": refresh_token,
                "user": user.to_dict(),
                "requiresPhoneVerification": not user.is_phone_verified
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth/refresh")
def refresh_token(
    authorization: str = Depends(oauth2_scheme),
    db_session: Session = Depends(get_db)
):
    """Refresh access token using refresh token"""
    try:
        payload = jwt.decode(authorization, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        token_type = payload.get("type")
        
        if token_type != "refresh":
            raise HTTPException(
                status_code=401,
                detail=ApiError(
                    message="Invalid token type",
                    code="INVALID_TOKEN_TYPE"
                ).model_dump(mode="json")
            )
        
        # Check if admin user
        if str(user_id).startswith('admin_'):
            actual_admin_id = user_id[6:]
            admin = db_session.get(AdminUser, actual_admin_id)
            
            if not admin:
                raise HTTPException(
                    status_code=404,
                    detail=ApiError(
                        message="Admin user not found",
                        code="USER_NOT_FOUND"
                    ).model_dump(mode="json")
                )
            
            if not admin.is_active:
                raise HTTPException(
                    status_code=401,
                    detail=ApiError(
                        message="Account is inactive",
                        code="ACCOUNT_INACTIVE"
                    ).model_dump(mode="json")
                )
            
            admin_identity = f'admin_{admin.id}' if not admin.id.startswith('admin_') else admin.id
            access_token = create_access_token(
                identity=admin_identity,
                additional_claims={'role': admin.role, 'user_type': 'admin'}
            )
            
            return ResponseEnvelope(data={"accessToken": access_token})
        else:
            user = db_session.get(User, user_id)
            
            if not user:
                raise HTTPException(
                    status_code=404,
                    detail=ApiError(
                        message="User not found",
                        code="USER_NOT_FOUND"
                    ).model_dump(mode="json")
                )
            
            if not user.is_active:
                raise HTTPException(
                    status_code=401,
                    detail=ApiError(
                        message="Account is inactive",
                        code="ACCOUNT_INACTIVE"
                    ).model_dump(mode="json")
                )
            
            access_token = create_access_token(
                identity=user.id,
                additional_claims={'tenant_id': user.tenant_id, 'role': user.role}
            )
            
            return ResponseEnvelope(data={"accessToken": access_token})
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail=ApiError(
                message="Token has expired",
                code="TOKEN_EXPIRED"
            ).model_dump(mode="json")
        )
    except jwt.JWTError as e:
        raise HTTPException(
            status_code=401,
            detail=ApiError(
                message="Invalid token",
                code="INVALID_TOKEN"
            ).model_dump(mode="json")
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/auth/me")
def get_current_user(
    authorization: str = Depends(oauth2_scheme),
    db_session: Session = Depends(get_db)
):
    """Get current authenticated user"""
    try:
        payload = jwt.decode(authorization, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        
        if str(user_id).startswith('admin_'):
            actual_admin_id = user_id[6:]
            admin = db_session.get(AdminUser, actual_admin_id)
            if not admin:
                raise HTTPException(status_code=404, detail="User not found")
            return ResponseEnvelope(data=admin.to_dict())
        else:
            user = db_session.get(User, user_id)
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            return ResponseEnvelope(data=user.to_dict())
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get current user error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
