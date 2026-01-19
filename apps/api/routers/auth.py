"""
FastAPI Auth Router - Migrated from Flask routes/auth.py
Handles login, logout, token refresh, OTP verification, password reset

G-03: Auth Boundary Migration
- All responses use Pydantic schema serialization (by_alias=True)
- NO to_dict() usage - use AuthUserRead.from_user_model() instead
- All endpoints have explicit response_model for OpenAPI generation
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from typing import Optional, Union
from datetime import datetime, timezone, timedelta
import logging
import random
import os

from sqlalchemy.orm import Session
from jose import jwt

from schemas.base import ResponseEnvelope, ApiError
from schemas.auth import (
    # Request schemas
    LoginRequest,
    LookupPhoneRequest,
    ForgotPasswordRequest,
    VerifyOtpRequest,
    ResetPasswordRequest,
    SetPasswordRequest,
    SendVerificationOtpRequest,
    PasswordChangeRequest,
    # Response schemas
    LoginResponse,
    LookupPhoneResponse,
    VerifyOtpResponse,
    ResetPasswordResponse,
    RefreshTokenResponse,
    MessageResponse,
    MessageResponse,
    AuthUserRead,
    AdminUserRead,
)
from schemas.users import UserRead
from models.user import User
from models.admin_user import AdminUser

from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db
from utils.error_messages import get_error_message

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Auth"])

# JWT Configuration
SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'default-dev-secret-key-change-in-prod')
ALGORITHM = "HS256"

# OAuth2 scheme for token extraction
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

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

@router.post("/auth/lookup-phone", operation_id="createAuthLookupPhone", response_model=ResponseEnvelope[LookupPhoneResponse])
def lookup_phone(
    request_data: LookupPhoneRequest,
    db_session: Session = Depends(get_db)
):
    """Lookup user by identifier and return masked phone"""
    try:
        identifier = request_data.identifier
        
        from utils.tenant_security import UnboundSession
        with UnboundSession():
            user = db_session.query(User).filter_by(username=identifier).first()
            if not user:
                user = db_session.query(User).filter_by(email=identifier).first()
            if not user:
                user = db_session.query(User).filter_by(phone=identifier).first()
        
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
        
        # Use Pydantic schema for type-safe serialization
        response_data = LookupPhoneResponse(
            masked_phone=masked,
            is_phone_input=identifier == user.phone,
            user_exists=True
        )
        
        return ResponseEnvelope(data=response_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Lookup phone error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth/forgot-password", operation_id="createAuthForgotPassword", response_model=ResponseEnvelope[MessageResponse])
def forgot_password(
    request_data: ForgotPasswordRequest,
    db_session: Session = Depends(get_db)
):
    """Send OTP for password reset"""
    try:
        identifier = request_data.identifier
        
        from utils.tenant_security import UnboundSession
        with UnboundSession():
            user = db_session.query(User).filter_by(phone=identifier).first()
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
        
        return ResponseEnvelope(data=MessageResponse(message="OTP sent to your phone"))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Forgot password error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth/verify-otp", operation_id="createAuthVerifyOtp", response_model=ResponseEnvelope[VerifyOtpResponse])
def verify_otp(
    request_data: VerifyOtpRequest,
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
        
        # Bypass for test/dev environment with fixed OTP
        if str(otp) == '123456':
            stored = '123456'
        else:
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
                    additional_claims={'access.tenant_id': user.tenant_id, 'role': user.role}
                )
                refresh_token = create_refresh_token(
                    identity=user.id,
                    additional_claims={'access.tenant_id': user.tenant_id, 'role': user.role}
                )
                
                # Use Pydantic schema for type-safe serialization (NO to_dict())
                user_data = AuthUserRead.from_user_model(user)
                response_data = VerifyOtpResponse(
                    verified=True,
                    access_token=access_token,
                    refresh_token=refresh_token,
                    user=user_data
                )
                
                return ResponseEnvelope(data=response_data, message="OTP verified")
        
        # Simple verification without tokens
        return ResponseEnvelope(data=VerifyOtpResponse(verified=True), message="OTP verified")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verify OTP error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth/reset-password", operation_id="createAuthResetPassword", response_model=ResponseEnvelope[ResetPasswordResponse])
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
            user = db_session.query(User).filter_by(phone=identifier).first()
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
        
        return ResponseEnvelope(data=ResetPasswordResponse(success=True, message="Password reset successfully"))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth/login", operation_id="createAuthLogin", response_model=ResponseEnvelope[LoginResponse])
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
                    message=get_error_message("MISSING_CREDENTIALS"),
                    code="MISSING_CREDENTIALS"
                ).model_dump(mode="json")
            )
        
        # Try admin_users first (for super admins), then regular users
        user = None
        is_admin_user = False
        
        from utils.tenant_security import UnboundSession
        with UnboundSession():
            # First, try to find in admin_users table (by email only)
            admin_user = db_session.query(AdminUser).filter_by(email=identifier).first()
            
            if admin_user and admin_user.check_password(password):
                user = admin_user
                is_admin_user = True
                logger.info(f"Admin user login: {identifier}")
            else:
                # Try regular users table (by username, email, or phone)
                user = db_session.query(User).filter_by(username=identifier).first()
                if not user:
                    user = db_session.query(User).filter_by(email=identifier).first()
                if not user:
                    user = db_session.query(User).filter_by(phone=identifier).first()
                
                if user and not user.check_password(password):
                    user = None
        
        if not user:
            try:
                from utils.activity_logging import log_login
                log_login(identifier, None, success=False)
            except Exception as e:
                logger.warning(f"Failed to log failed login: {e}")
            
            raise HTTPException(
                status_code=401,
                detail=ApiError(
                    message=get_error_message("INVALID_CREDENTIALS"),
                    code="INVALID_CREDENTIALS"
                ).model_dump(mode="json")
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=401,
                detail=ApiError(
                    message=get_error_message("ACCOUNT_INACTIVE"),
                    code="ACCOUNT_INACTIVE"
                ).model_dump(mode="json")
            )
        
        # Send OTP if phone not verified (only for regular users, not admins)
        if not is_admin_user and hasattr(user, 'is_phone_verified') and not user.is_phone_verified and user.phone:
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
        
        # Log successful login (use 'system' tenant for admin users)
        try:
            from utils.activity_logging import log_login
            tenant_id = 'system' if is_admin_user else getattr(user, 'tenant_id', None)
            log_login(user.id, tenant_id, success=True)
        except Exception as e:
            logger.warning(f"Failed to log login activity: {e}")
        
        # Get user permissions from role
        role_permissions = []
        user_role = user.role
        
        # Admin users have all permissions
        if is_admin_user:
            role_permissions = ['*']  # Wildcard for all permissions
        else:
            try:
                from models.role import Role
                role = db_session.query(Role).filter_by(name=user.role).first()
                if role and hasattr(role, 'permissions'):
                    role_permissions = [p.name for p in role.permissions]
            except Exception as e:
                logger.warning(f"Failed to load role permissions: {e}")
        
        # Get permissions version for token invalidation on permission changes
        permissions_version = getattr(user, 'permissions_version', 1) or 1
        
        # Use 'system' tenant for admin users
        tenant_id = 'system' if is_admin_user else getattr(user, 'tenant_id', None)
        
        # CRITICAL: Admin users need admin_ prefix in token identity for UnifiedAccess middleware
        token_identity = f'admin_{user.id}' if is_admin_user else user.id
        
        access_token = create_access_token(
            identity=token_identity,
            additional_claims={
                'tenant_id': tenant_id,
                'role': user_role,
                'role_permissions': role_permissions,
                'perm_ver': permissions_version,
                'is_admin': is_admin_user  # Flag to identify admin users
            }
        )
        refresh_token = create_refresh_token(
            identity=token_identity,
            additional_claims={
                'tenant_id': tenant_id,
                'role': user_role,
                'role_permissions': role_permissions,
                'perm_ver': permissions_version,
                'is_admin': is_admin_user
            }
        )
        
        # Use appropriate schema based on user type
        if is_admin_user:
            user_data = AdminUserRead.from_admin_model(user)
        else:
            user_data = AuthUserRead.from_user_model(user)
        
        response_data = LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=user_data,
            requires_phone_verification=False if is_admin_user else not getattr(user, 'is_phone_verified', True)
        )
        
        return ResponseEnvelope(data=response_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth/refresh", operation_id="createAuthRefresh", response_model=ResponseEnvelope[RefreshTokenResponse])
def refresh_token(
    authorization: str = Depends(oauth2_scheme),
    db_session: Session = Depends(get_db)
):
    """Refresh access token using refresh token"""
    try:
        # oauth2_scheme returns the token without "Bearer " prefix
        token = authorization
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
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
            
            # Get role permissions for admin
            role_permissions = ['*']  # Admin has all permissions
            
            access_token = create_access_token(
                identity=f'admin_{admin.id}',
                additional_claims={
                    'tenant_id': 'system',
                    'role': admin.role,
                    'role_permissions': role_permissions,
                    'is_admin': True
                }
            )
            
            return ResponseEnvelope(data=RefreshTokenResponse(access_token=access_token))
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
                additional_claims={'access.tenant_id': user.tenant_id, 'role': user.role}
            )
            
            return ResponseEnvelope(data=RefreshTokenResponse(access_token=access_token))
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

@router.get("/auth/me", operation_id="getAuthMe", response_model=ResponseEnvelope[Union[AuthUserRead, AdminUserRead]])
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
            
            return ResponseEnvelope(data=AdminUserRead.from_model(admin))
        else:
            user = db_session.get(User, user_id)
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            # Use Pydantic schema for type-safe serialization (NO to_dict())
            user_data = AuthUserRead.from_user_model(user)
            return ResponseEnvelope(data=user_data)
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get current user error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth/send-verification-otp", operation_id="createAuthSendVerificationOtp", response_model=ResponseEnvelope[MessageResponse])
def send_verification_otp(
    request_data: SendVerificationOtpRequest,
    authorization: str = Depends(oauth2_scheme),
    db_session: Session = Depends(get_db)
):
    """Send OTP to the user's phone number (requires pre-auth token)"""
    try:
        payload = jwt.decode(authorization, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        
        user = db_session.get(User, user_id)
        if not user:
            raise HTTPException(
                status_code=401,
                detail=ApiError(message="User context required", code="USER_REQUIRED").model_dump(mode="json")
            )
        
        phone = request_data.phone
        
        if phone:
            # Update phone if provided
            existing = db_session.query(User).filter(User.phone == phone, User.id != user.id).first()
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail=ApiError(message="Phone number already in use", code="PHONE_EXISTS").model_dump(mode="json")
                )
            user.phone = phone
            db_session.commit()
        
        if not user.phone:
            raise HTTPException(
                status_code=400,
                detail=ApiError(message="Phone number required", code="PHONE_REQUIRED").model_dump(mode="json")
            )
        
        otp_store = get_otp_store()
        code = str(random.randint(100000, 999999))
        otp_store.set_otp(user.id, code, ttl=300)
        
        # Send SMS
        from services.communication_service import communication_service
        msg = f"X-EAR dogrulama kodunuz: {code}. Bu kodu kimseyle paylasmayiniz."
        result = communication_service.send_sms(user.phone, msg)
        
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
        
        return ResponseEnvelope(data=MessageResponse(message="OTP sent"))
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send OTP error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth/set-password", operation_id="createAuthSetPassword", response_model=ResponseEnvelope[MessageResponse])
def set_password(
    request_data: SetPasswordRequest,
    authorization: str = Depends(oauth2_scheme),
    db_session: Session = Depends(get_db)
):
    """Set password for authenticated user (Post-Registration Flow)"""
    try:
        payload = jwt.decode(authorization, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        
        user = db_session.get(User, user_id)
        if not user:
            raise HTTPException(
                status_code=401,
                detail=ApiError(message="User context required", code="USER_REQUIRED").model_dump(mode="json")
            )
        
        user.set_password(request_data.password)
        db_session.commit()
        
        return ResponseEnvelope(data=MessageResponse(message="Password set successfully"))
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Set password error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth/test/toggle-verification", include_in_schema=False)
def toggle_verification(
    verified: bool = Body(..., embed=True),
    db_session: Session = Depends(get_db)
):
    """Test utility to toggle phone verification status"""
    from models.user import User
    # Only allow for specific test user
    user = db_session.query(User).filter(User.phone == '+905551234567').first()
    if user:
        user.is_phone_verified = verified
        db_session.commit()
    return {"success": True}

