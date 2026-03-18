"""
FastAPI Auth Router - Migrated from Flask routes/auth.py
Handles login, logout, token refresh, OTP verification, password reset

G-03: Auth Boundary Migration
- All responses use Pydantic schema serialization (by_alias=True)
- NO to_dict() usage - use AuthUserRead.from_user_model() instead
- All endpoints have explicit response_model for OpenAPI generation
"""
from fastapi import APIRouter, Depends, HTTPException, Body, Header, Response, Request
from fastapi.security import OAuth2PasswordBearer
from typing import Optional, Union
from datetime import datetime, timezone, timedelta
import logging
import random
import os
from uuid import uuid4

from sqlalchemy import text
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
    LoginResponse,
    LookupPhoneResponse,
    VerifyOtpResponse,
    ResetPasswordResponse,
    RefreshTokenResponse,
    MessageResponse,
    AuthUserRead,
    AuthAdminUserRead,
)
from models.user import User
from core.models.user import ActivityLog
from models.admin_user import AdminUser

from database import get_db
from utils.error_messages import get_error_message
from utils.rate_limit import rate_limit

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Auth"])

# JWT Configuration
from core.security import get_jwt_secret, JWT_ALGORITHM
SECRET_KEY = get_jwt_secret()
ALGORITHM = JWT_ALGORITHM

# OAuth2 scheme for token extraction
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# --- Helper Functions ---

def _phone_key_candidates(phone: Optional[str]) -> list[str]:
    """Build stable OTP lookup keys for phone-based verification."""
    if not phone:
        return []
    raw = str(phone).strip()
    digits = ''.join(ch for ch in raw if ch.isdigit())
    candidates: list[str] = []
    for value in (raw, digits):
        if value and value not in candidates:
            candidates.append(value)
    if digits:
        if len(digits) == 10 and f"0{digits}" not in candidates:
            candidates.append(f"0{digits}")
        if digits.startswith("0") and len(digits) == 11:
            local = digits[1:]
            if local not in candidates:
                candidates.append(local)
            if f"90{local}" not in candidates:
                candidates.append(f"90{local}")
        elif digits.startswith("90") and len(digits) == 12:
            local = digits[2:]
            if local not in candidates:
                candidates.append(local)
            if f"0{local}" not in candidates:
                candidates.append(f"0{local}")
    return candidates


def _is_nonprod_otp_env() -> bool:
    return os.getenv('ENVIRONMENT', 'production').lower() in {'development', 'test', 'testing'}


def _generate_otp_code() -> str:
    if _is_nonprod_otp_env():
        # Use a per-run random OTP even in dev (logged for convenience)
        code = str(random.randint(100000, 999999))
        logger.info(f"[DEV] Generated OTP: {code}")
        return code
    return str(random.randint(100000, 999999))


def _should_skip_external_sms() -> bool:
    if not _is_nonprod_otp_env():
        return False
    return os.getenv('ENABLE_REAL_SMS_IN_TESTS', 'false').lower() not in {'1', 'true', 'yes'}

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

_IS_PROD = os.getenv('ENVIRONMENT', 'development').lower() in ('production', 'prod', 'staging')

def _set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    """Set httpOnly cookies for both tokens."""
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=_IS_PROD,
        samesite="lax",
        max_age=8 * 3600,  # 8 hours
        path="/api",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=_IS_PROD,
        samesite="lax",
        max_age=30 * 24 * 3600,  # 30 days
        path="/api/auth/refresh",
    )

def _clear_auth_cookies(response: Response):
    """Clear auth cookies on logout."""
    response.delete_cookie("access_token", path="/api")
    response.delete_cookie("refresh_token", path="/api/auth/refresh")


def get_otp_store():
    """Get OTP store instance"""
    from services.otp_store import get_store
    return get_store()

# --- Routes ---

@router.post("/auth/lookup-phone", operation_id="createAuthLookupPhone", response_model=ResponseEnvelope[LookupPhoneResponse])
@rate_limit(window_seconds=900, max_calls=10, key_prefix="lookup_phone")
def lookup_phone(
    request_data: LookupPhoneRequest,
    db_session: Session = Depends(get_db)
):
    """Lookup user by identifier and return masked phone"""
    try:
        identifier = request_data.identifier
        
        from database import unbound_session
        with unbound_session(reason="auth-lookup-phone"):
            user = db_session.query(User).filter_by(username=identifier).first()
            if not user:
                user = db_session.query(User).filter_by(email=identifier).first()
            if not user:
                user = db_session.query(User).filter_by(phone=identifier).first()
        
        if not user or not user.phone:
            # Always return success to prevent user enumeration
            return ResponseEnvelope(data=LookupPhoneResponse(
                masked_phone="*******####",
                is_phone_input=False,
                user_exists=True  # Always true to prevent enumeration
            ))
        
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
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/auth/forgot-password", operation_id="createAuthForgotPassword", response_model=ResponseEnvelope[MessageResponse])
@rate_limit(window_seconds=900, max_calls=5, key_prefix="forgot_password")
def forgot_password(
    request_data: ForgotPasswordRequest,
    db_session: Session = Depends(get_db)
):
    """Send OTP for password reset"""
    try:
        identifier = request_data.identifier
        
        from database import unbound_session
        with unbound_session(reason="auth-forgot-password"):
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
        code = _generate_otp_code()
        otp_store.set_otp(identifier, code, ttl=300)

        if _should_skip_external_sms():
            logger.info("Skipping external forgot-password SMS in non-production OTP env")
        else:
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
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/auth/verify-otp", operation_id="createAuthVerifyOtp", response_model=ResponseEnvelope[VerifyOtpResponse])
@rate_limit(window_seconds=900, max_calls=5, key_prefix="verify_otp")
def verify_otp(
    request_data: VerifyOtpRequest,
    authorization: Optional[str] = Header(None),
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
                logger.info(f"Extracted user_id from token: {user_id}")
            except Exception as e:
                logger.warning(f"Failed to decode token: {e}")
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

        lookup_keys = [target_id]
        if identifier:
            lookup_keys.extend(
                [candidate for candidate in _phone_key_candidates(identifier) if candidate not in lookup_keys]
            )
        stored = None
        for lookup_key in lookup_keys:
            stored = otp_store.get_otp(lookup_key)
            if stored:
                logger.info(f"OTP found with lookup_key={lookup_key}")
                break

        # If not found with target_id, try with user_id (for phone verification flow)
        if not stored and user_id:
            logger.info(f"OTP not found with target_id={target_id}, trying user_id={user_id}")
            stored = otp_store.get_otp(user_id)
            if stored:
                logger.info(f"OTP found with user_id={user_id}")
            else:
                logger.warning(f"OTP not found with user_id={user_id} either")

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
            for phone_key in _phone_key_candidates(identifier):
                otp_store.delete_otp(phone_key)

            from database import unbound_session
            with unbound_session(reason="auth-verify-otp-user-lookup"):
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
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/auth/reset-password", operation_id="createAuthResetPassword", response_model=ResponseEnvelope[ResetPasswordResponse])
async def reset_password(
    request_data: ResetPasswordRequest,
    db_session: Session = Depends(get_db)
):
    """Reset password using verified OTP"""
    try:
        identifier = request_data.identifier
        otp = request_data.otp
        new_password = request_data.new_password
        captcha_token = request_data.captcha_token
        
        # Validate captcha token if provided
        if captcha_token:
            from utils.recaptcha import verify_recaptcha_token, is_valid_recaptcha
            
            try:
                verification_result = await verify_recaptcha_token(captcha_token, action='password_reset')
                
                if not is_valid_recaptcha(verification_result, expected_action='password_reset'):
                    raise HTTPException(
                        status_code=400,
                        detail=ApiError(
                            message="Güvenlik doğrulaması başarısız. Lütfen tekrar deneyin.",
                            code="CAPTCHA_INVALID"
                        ).model_dump(mode="json")
                    )
            except Exception as e:
                logger.error(f"Captcha verification error: {e}")
                raise HTTPException(
                    status_code=400,
                    detail=ApiError(
                        message="Güvenlik doğrulaması başarısız. Lütfen tekrar deneyin.",
                        code="CAPTCHA_VERIFICATION_FAILED"
                    ).model_dump(mode="json")
                )
        else:
            env = os.getenv('ENVIRONMENT', 'production').lower()
            if env in ('production', 'prod', 'staging'):
                raise HTTPException(
                    status_code=400,
                    detail=ApiError(
                        message="Güvenlik doğrulaması gereklidir.",
                        code="CAPTCHA_REQUIRED"
                    ).model_dump(mode="json")
                )
            logger.warning(f"Password reset without captcha token for identifier: {identifier}")
        
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
        
        from database import unbound_session
        with unbound_session(reason="auth-reset-password"):
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
            db_session.add(ActivityLog(
                user_id=user.id, tenant_id=user.tenant_id,
                action='password_reset', message='Password reset via SMS OTP',
                entity_type='user', entity_id=user.id, is_critical=True
            ))
            db_session.commit()
        except Exception as e:
            logger.warning(f"Failed to log password reset activity: {e}")
            db_session.rollback()
        
        return ResponseEnvelope(data=ResetPasswordResponse(success=True, message="Password reset successfully"))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/auth/login", operation_id="createAuthLogin", response_model=ResponseEnvelope[LoginResponse])
def login(
    request_data: LoginRequest,
    request: Request = None,
    response: Response = None,
    db_session: Session = Depends(get_db)
):
    """Login with username/email/phone and password"""
    try:
        # TODO: Re-enable rate limiting after Redis integration is verified
        # Rate limiting is handled by the OTP store's increment_rate for sensitive ops

        identifier = (
            request_data.identifier or
            request_data.username or
            request_data.email or
            request_data.phone
        )
        password = request_data.password

        masked = f"{identifier[:3]}***" if identifier and len(identifier) > 3 else "***"
        logger.info(f"Login attempt - identifier: {masked}")
        
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
        
        from database import unbound_session
        with unbound_session(reason="auth-login"):
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
                db_session.add(ActivityLog(
                    action='auth.failed_login', message='Başarısız giriş denemesi',
                    entity_type='user', entity_id=identifier, is_critical=True
                ))
                db_session.commit()
            except Exception as e:
                logger.warning(f"Failed to log failed login: {e}")
                db_session.rollback()
            
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
        
        # Update last login
        try:
            user.last_login = datetime.now(timezone.utc)
            db_session.add(user)
            db_session.commit()
        except Exception:
            db_session.rollback()
        
        # Log successful login (use 'system' tenant for admin users)
        try:
            _login_tenant = 'system' if is_admin_user else getattr(user, 'tenant_id', None)
            db_session.add(ActivityLog(
                user_id=user.id, tenant_id=_login_tenant,
                action='auth.login', message='Sisteme giriş yapıldı',
                entity_type='user', entity_id=user.id, is_critical=True
            ))
            db_session.commit()
        except Exception as e:
            logger.warning(f"Failed to log login activity: {e}")
            db_session.rollback()
        
        # Get user permissions from role
        role_permissions = []
        user_role = user.role
        
        # Admin users have all permissions
        if is_admin_user or (user_role and user_role.upper() == 'ADMIN'):
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
        
        # CRITICAL: Admin users need admin_ or adm_ prefix in token identity for UnifiedAccess middleware
        # If ID already has adm_ prefix, don't add admin_ again
        if is_admin_user:
            token_identity = user.id if user.id.startswith('adm_') else f'admin_{user.id}'
        else:
            token_identity = user.id
        
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
            user_data = AuthAdminUserRead.from_admin_model(user)
        else:
            user_data = AuthUserRead.from_user_model(user)
        
        response_data = LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=user_data,
            requires_phone_verification=False if is_admin_user else not getattr(user, 'is_phone_verified', True)
        )

        # Set httpOnly cookies (frontend can use cookies OR JSON tokens)
        if response is not None:
            _set_auth_cookies(response, access_token, refresh_token)

        return ResponseEnvelope(data=response_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/auth/refresh", operation_id="createAuthRefresh", response_model=ResponseEnvelope[RefreshTokenResponse])
def refresh_token(
    request: Request = None,
    response: Response = None,
    authorization: str = Depends(oauth2_scheme),
    db_session: Session = Depends(get_db)
):
    """Refresh access token using refresh token"""
    try:
        # Try cookie first, then Authorization header
        if not authorization and request:
            authorization = request.cookies.get("refresh_token")
        if not authorization:
             raise HTTPException(
                status_code=401,
                detail=ApiError(
                    message="Refresh token required",
                    code="TOKEN_REQUIRED"
                ).model_dump(mode="json")
            )

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
            
            if response is not None:
                response.set_cookie(key="access_token", value=access_token, httponly=True, secure=_IS_PROD, samesite="lax", max_age=8*3600, path="/api")
            return ResponseEnvelope(data=RefreshTokenResponse(access_token=access_token))
        else:
            from database import unbound_session

            with unbound_session(reason="auth-refresh-user-lookup"):
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
                additional_claims={
                    'tenant_id': user.tenant_id,
                    'role': user.role,
                    'role_permissions': ['*'] if (user.role and user.role.upper() == 'ADMIN') else [],
                    'perm_ver': getattr(user, 'permissions_version', 1) or 1,
                    'is_admin': False,
                }
            )

            if response is not None:
                response.set_cookie(key="access_token", value=access_token, httponly=True, secure=_IS_PROD, samesite="lax", max_age=8*3600, path="/api")
            return ResponseEnvelope(data=RefreshTokenResponse(access_token=access_token))
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail=ApiError(
                message="Token has expired",
                code="TOKEN_EXPIRED"
            ).model_dump(mode="json")
        )
    except jwt.JWTError:
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
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/auth/me", operation_id="getAuthMe", response_model=ResponseEnvelope[Union[AuthUserRead, AuthAdminUserRead]])
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
            
            return ResponseEnvelope(data=AuthAdminUserRead.from_model(admin))
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
        raise HTTPException(status_code=500, detail="Internal server error")

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

        from database import unbound_session
        with unbound_session(reason="auth-send-verification-otp-user-lookup"):
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
        code = _generate_otp_code()
        otp_store.set_otp(user.id, code, ttl=300)
        for phone_key in _phone_key_candidates(user.phone):
            otp_store.set_otp(phone_key, code, ttl=300)

        if _should_skip_external_sms():
            logger.info("Skipping external phone-verification SMS in non-production OTP env")
        else:
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
        raise HTTPException(status_code=500, detail="Internal server error")

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
        raise HTTPException(status_code=500, detail="Internal server error")

if os.getenv('ENVIRONMENT', 'production').lower() in ('development', 'test', 'testing'):

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


    @router.post("/auth/test/prepare-otp-users", include_in_schema=False)
    def prepare_otp_users(db_session: Session = Depends(get_db)):
        """Create/update deterministic OTP test users for UI and API E2E flows."""
        now = datetime.now(timezone.utc)
        tenant_row = db_session.execute(
            text("SELECT id FROM tenants WHERE slug = :slug LIMIT 1"),
            {"slug": "otp-test-tenant"},
        ).first()

        if tenant_row and tenant_row[0]:
            tenant_id = str(tenant_row[0])
        else:
            tenant_id = str(uuid4())
            db_session.execute(
                text(
                    """
                    INSERT INTO tenants (
                        id, name, slug, owner_email, billing_email, tenant_type, status,
                        company_info, settings, created_at, updated_at
                    ) VALUES (
                        :id, :name, :slug, :owner_email, :billing_email, :tenant_type, :status,
                        :company_info, :settings, :created_at, :updated_at
                    )
                    ON CONFLICT(slug) DO UPDATE SET
                        updated_at = excluded.updated_at
                    """
                ),
                {
                    "id": tenant_id,
                    "name": "OTP Test Tenant",
                    "slug": "otp-test-tenant",
                    "owner_email": "otp-test@x-ear.local",
                    "billing_email": "otp-test@x-ear.local",
                    "tenant_type": "B2B",
                    "status": "active",
                    "company_info": "{}",
                    "settings": "{}",
                    "created_at": now,
                    "updated_at": now,
                },
            )
            tenant_row = db_session.execute(
                text("SELECT id FROM tenants WHERE slug = :slug LIMIT 1"),
                {"slug": "otp-test-tenant"},
            ).first()
            if not tenant_row or not tenant_row[0]:
                raise HTTPException(status_code=500, detail="OTP test tenant could not be prepared")
            tenant_id = str(tenant_row[0])
        scenarios = [
            {
                "username": "unverified_phone_user",
                "email": "unverified@test.com",
                "phone": "5551234567",
                "verified": False,
                "password": "testpass123",
                "first_name": "Unverified",
                "last_name": "Phone",
            },
            {
                "username": "no_phone_user",
                "email": "nophone@test.com",
                "phone": None,
                "verified": False,
                "password": "testpass123",
                "first_name": "No",
                "last_name": "Phone",
            },
            {
                "username": "forgot_password_user",
                "email": "forgot@test.com",
                "phone": "5559876543",
                "verified": True,
                "password": "OldPass123!",
                "first_name": "Forgot",
                "last_name": "Password",
            },
            {
                "username": "profile_phone_user",
                "email": "profile@test.com",
                "phone": "5558887777",
                "verified": True,
                "password": "testpass123",
                "first_name": "Profile",
                "last_name": "Phone",
            },
        ]

        created_users: list[dict[str, str | None | bool]] = []
        for scenario in scenarios:
            probe_user = User()
            probe_user.username = str(scenario["username"])
            probe_user.email = str(scenario["email"])
            probe_user.phone = scenario["phone"]
            probe_user.first_name = str(scenario["first_name"])
            probe_user.last_name = str(scenario["last_name"])
            probe_user.role = 'tenant_admin'
            probe_user.is_active = True
            probe_user.is_phone_verified = bool(scenario["verified"])
            probe_user.tenant_id = tenant_id
            probe_user.set_password(str(scenario["password"]))

            db_session.execute(
                text(
                    """
                    INSERT INTO users (
                        id, username, email, phone, password_hash, first_name, last_name, role,
                        is_active, is_phone_verified, permissions_version, created_at, updated_at, tenant_id
                    ) VALUES (
                        :id, :username, :email, :phone, :password_hash, :first_name, :last_name, :role,
                        :is_active, :is_phone_verified, :permissions_version, :created_at, :updated_at, :tenant_id
                    )
                    ON CONFLICT(username) DO UPDATE SET
                        email = excluded.email,
                        phone = excluded.phone,
                        password_hash = excluded.password_hash,
                        first_name = excluded.first_name,
                        last_name = excluded.last_name,
                        role = excluded.role,
                        is_active = excluded.is_active,
                        is_phone_verified = excluded.is_phone_verified,
                        permissions_version = excluded.permissions_version,
                        updated_at = excluded.updated_at,
                        tenant_id = excluded.tenant_id
                    """
                ),
                {
                    "id": f"user_{uuid4().hex[:12]}",
                    "username": probe_user.username,
                    "email": probe_user.email,
                    "phone": probe_user.phone,
                    "password_hash": probe_user.password_hash,
                    "first_name": probe_user.first_name,
                    "last_name": probe_user.last_name,
                    "role": probe_user.role,
                    "is_active": probe_user.is_active,
                    "is_phone_verified": probe_user.is_phone_verified,
                    "permissions_version": 1,
                    "created_at": now,
                    "updated_at": now,
                    "tenant_id": tenant_id,
                },
            )

            created_users.append(
                {
                    "username": probe_user.username,
                    "phone": probe_user.phone,
                    "verified": probe_user.is_phone_verified,
                }
            )

        db_session.commit()
        return {"success": True, "users": created_users}
