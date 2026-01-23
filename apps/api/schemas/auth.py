"""
Auth Schemas - Pydantic models for Authentication domain

G-03: Auth Boundary Migration - Type-safe auth response schemas
All auth endpoints MUST use these schemas for serialization (by_alias=True)
"""
from typing import Optional, List, Union
from datetime import datetime
from pydantic import Field, EmailStr
from .base import AppBaseModel


# ============================================================================
# Request Schemas
# ============================================================================

class LoginRequest(AppBaseModel):
    """Login request schema"""
    identifier: Optional[str] = Field(None, description="Username, email or phone")
    username: Optional[str] = Field(None, description="Username")
    email: Optional[str] = Field(None, description="Email")
    phone: Optional[str] = Field(None, description="Phone")
    password: str = Field(..., description="Password")


class LookupPhoneRequest(AppBaseModel):
    """Phone lookup request schema"""
    identifier: str = Field(..., description="Username, email or phone to lookup")


class ForgotPasswordRequest(AppBaseModel):
    """Forgot password request schema"""
    identifier: str = Field(..., description="Phone number")
    captcha_token: str = Field(..., alias="captchaToken", description="Captcha token")


class VerifyOtpRequest(AppBaseModel):
    """OTP verification request schema"""
    otp: str = Field(..., description="OTP code")
    identifier: Optional[str] = Field(None, description="User identifier (phone/email)")


class ResetPasswordRequest(AppBaseModel):
    """Reset password request schema"""
    identifier: str = Field(..., description="Phone number")
    otp: str = Field(..., description="OTP code")
    new_password: str = Field(..., alias="newPassword", min_length=6, description="New password")


class SetPasswordRequest(AppBaseModel):
    """Set password request schema (post-registration)"""
    password: str = Field(..., min_length=6, description="New password")


class SendVerificationOtpRequest(AppBaseModel):
    """Send verification OTP request schema"""
    phone: Optional[str] = Field(None, description="Phone number to verify")


class PasswordChangeRequest(AppBaseModel):
    """Password change request schema"""
    current_password: str = Field(..., alias="currentPassword", description="Current password")
    new_password: str = Field(..., alias="newPassword", min_length=6, description="New password")


# Legacy alias for backward compatibility
OTPVerifyRequest = VerifyOtpRequest


# ============================================================================
# Response Schemas - User Data
# ============================================================================

class AuthUserRead(AppBaseModel):
    """
    User data returned in auth responses.
    
    This is a subset of UserRead specifically for auth responses.
    Does NOT include sensitive fields like password_hash.
    """
    id: str = Field(..., description="User ID")
    tenant_id: str = Field(..., alias="tenantId", description="Tenant ID")
    username: Optional[str] = Field(None, description="Username")
    email: EmailStr = Field(..., description="Email address")
    first_name: str = Field(..., alias="firstName", description="First name")
    last_name: str = Field(..., alias="lastName", description="Last name")
    full_name: str = Field(..., alias="fullName", description="Full name")
    role: str = Field(..., description="User role")
    phone: Optional[str] = Field(None, description="Phone number")
    is_phone_verified: bool = Field(False, alias="isPhoneVerified", description="Phone verification status")
    is_active: bool = Field(True, alias="isActive", description="Account active status")
    last_login: Optional[datetime] = Field(None, alias="lastLogin", description="Last login timestamp")
    created_at: Optional[datetime] = Field(None, alias="createdAt", description="Account creation timestamp")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt", description="Last update timestamp")
    
    @classmethod
    def from_user_model(cls, user) -> "AuthUserRead":
        """
        Create AuthUserRead from User ORM model.
        
        Use this instead of user.to_dict() for type-safe serialization.
        """
        return cls(
            id=user.id,
            tenant_id=user.tenant_id,
            username=user.username,
            email=user.email,
            first_name=user.first_name or "",
            last_name=user.last_name or "",
            full_name=f"{user.first_name} {user.last_name}" if user.first_name and user.last_name else user.username,
            role=user.role,
            phone=user.phone,
            is_phone_verified=user.is_phone_verified,
            is_active=user.is_active,
            last_login=user.last_login,
            created_at=user.created_at if hasattr(user, 'created_at') else None,
            updated_at=user.updated_at if hasattr(user, 'updated_at') else None,
        )

class AuthAdminUserRead(AppBaseModel):
    """
    Admin user data returned in auth responses.
    """
    id: str = Field(..., description="User ID")
    email: EmailStr = Field(..., description="Email address")
    first_name: Optional[str] = Field(None, alias="firstName", description="First name")
    last_name: Optional[str] = Field(None, alias="lastName", description="Last name")
    role: str = Field(..., description="User role")
    is_active: bool = Field(True, alias="isActive", description="Account active status")
    mfa_enabled: bool = Field(False, alias="mfaEnabled", description="MFA Status")
    last_login: Optional[datetime] = Field(None, alias="lastLogin", description="Last login timestamp")
    created_at: Optional[datetime] = Field(None, alias="createdAt", description="Account creation timestamp")
    username: Optional[str] = Field(None, description="Username")
    is_super_admin: bool = Field(False, alias="isSuperAdmin", description="Super Admin status")
    
    @classmethod
    def from_model(cls, user) -> "AuthAdminUserRead":
        """Create from AdminUser model instance"""
        return cls(
            id=user.id,
            username=getattr(user, 'username', user.email),
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            is_active=user.is_active,
            mfa_enabled=getattr(user, 'mfa_enabled', False),
            last_login=user.last_login,
            created_at=user.created_at,
            is_super_admin=user.is_super_admin() if hasattr(user, 'is_super_admin') else (user.role == 'super_admin')
        )
    
    @classmethod
    def from_admin_model(cls, user) -> "AuthAdminUserRead":
        """Alias for from_model - for clarity when used with AdminUser"""
        return cls.from_model(user)


# ============================================================================
# Response Schemas - Auth Endpoints
# ============================================================================

class LoginResponse(AppBaseModel):
    """
    Response for login endpoint.
    
    Contains tokens and user data for successful authentication.
    Supports both regular users (AuthUserRead) and admin users (AdminUserRead).
    """
    access_token: str = Field(..., alias="accessToken", description="JWT access token")
    refresh_token: str = Field(..., alias="refreshToken", description="JWT refresh token")
    user: Union[AuthUserRead, AuthAdminUserRead] = Field(..., description="Authenticated user data")
    requires_phone_verification: bool = Field(False, alias="requiresPhoneVerification", description="Whether phone verification is required")


class LookupPhoneResponse(AppBaseModel):
    """
    Response for phone lookup endpoint.
    
    Returns masked phone number for password reset flow.
    """
    masked_phone: str = Field(..., alias="maskedPhone", description="Masked phone number (e.g., ****1234)")
    is_phone_input: bool = Field(..., alias="isPhoneInput", description="Whether input was the phone number itself")
    user_exists: bool = Field(True, alias="userExists", description="Whether user was found")


class VerifyOtpResponse(AppBaseModel):
    """
    Response for OTP verification endpoint.
    
    Returns tokens if user was authenticated, otherwise just verification status.
    """
    verified: bool = Field(True, description="OTP verification status")
    access_token: Optional[str] = Field(None, alias="accessToken", description="JWT access token (if authenticated)")
    refresh_token: Optional[str] = Field(None, alias="refreshToken", description="JWT refresh token (if authenticated)")
    user: Optional[AuthUserRead] = Field(None, description="User data (if authenticated)")


class ResetPasswordResponse(AppBaseModel):
    """Response for password reset endpoint."""
    success: bool = Field(True, description="Password reset success status")
    message: str = Field("Password reset successfully", description="Status message")


class RefreshTokenResponse(AppBaseModel):
    """Response for token refresh endpoint."""
    access_token: str = Field(..., alias="accessToken", description="New JWT access token")


class MessageResponse(AppBaseModel):
    """Generic message response for auth endpoints."""
    message: str = Field(..., description="Status message")


# ============================================================================
# Legacy Aliases - For backward compatibility
# ============================================================================

# TokenResponse is now LoginResponse
TokenResponse = LoginResponse
