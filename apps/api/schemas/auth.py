"""
Auth Schemas - Pydantic models for Authentication domain
"""
from typing import Optional, Dict, Any
from pydantic import Field
from .base import AppBaseModel


class LoginRequest(AppBaseModel):
    """Login request schema"""
    identifier: Optional[str] = Field(None, description="Username, email or phone")
    username: Optional[str] = Field(None, description="Username")
    email: Optional[str] = Field(None, description="Email")
    phone: Optional[str] = Field(None, description="Phone")
    password: str = Field(..., description="Password")


class TokenResponse(AppBaseModel):
    """Token response schema"""
    access_token: str = Field(..., alias="accessToken", description="JWT access token")
    refresh_token: str = Field(..., alias="refreshToken", description="JWT refresh token")
    user: Dict[str, Any] = Field(..., description="User data")
    requires_phone_verification: bool = Field(False, alias="requiresPhoneVerification")


class RefreshTokenResponse(AppBaseModel):
    """Refresh token response schema"""
    access_token: str = Field(..., alias="accessToken", description="New JWT access token")


class PasswordChangeRequest(AppBaseModel):
    """Password change request schema"""
    current_password: str = Field(..., alias="currentPassword", description="Current password")
    new_password: str = Field(..., alias="newPassword", min_length=6, description="New password")


class OTPVerifyRequest(AppBaseModel):
    """OTP verification request schema"""
    otp: str = Field(..., description="OTP code")
    identifier: Optional[str] = Field(None, description="User identifier")


class ForgotPasswordRequest(AppBaseModel):
    """Forgot password request schema"""
    identifier: str = Field(..., description="Phone number")
    captcha_token: str = Field(..., alias="captchaToken", description="Captcha token")


class ResetPasswordRequest(AppBaseModel):
    """Reset password request schema"""
    identifier: str = Field(..., description="Phone number")
    otp: str = Field(..., description="OTP code")
    new_password: str = Field(..., alias="newPassword", min_length=6, description="New password")
