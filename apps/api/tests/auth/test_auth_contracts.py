"""
Auth Contract Tests - G-03 Auth Boundary Migration

These tests verify that auth response shapes match the Pydantic schemas.
NO snapshot tests - only schema validation (per design.md rules).
"""
import pytest
from pydantic import ValidationError

from schemas.auth import (
    LoginRequest,
    LoginResponse,
    LookupPhoneRequest,
    LookupPhoneResponse,
    VerifyOtpRequest,
    VerifyOtpResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    RefreshTokenResponse,
    MessageResponse,
    AuthUserRead,
)
from schemas.base import ResponseEnvelope


class TestAuthUserReadSchema:
    """Test AuthUserRead schema validation"""
    
    def test_valid_user_data(self):
        """AuthUserRead should accept valid user data"""
        user_data = AuthUserRead(
            id="usr_123",
            tenant_id="tenant_456",
            username="testuser",
            email="test@example.com",
            first_name="Test",
            last_name="User",
            full_name="Test User",
            role="user",
            phone="+905551234567",
            is_phone_verified=True,
            is_active=True,
        )
        
        assert user_data.id == "usr_123"
        assert user_data.tenant_id == "tenant_456"
        assert user_data.email == "test@example.com"
    
    def test_camel_case_serialization(self):
        """AuthUserRead should serialize to camelCase"""
        user_data = AuthUserRead(
            id="usr_123",
            tenant_id="tenant_456",
            email="test@example.com",
            first_name="Test",
            last_name="User",
            full_name="Test User",
            role="user",
            is_active=True,
        )
        
        # Serialize with aliases (camelCase)
        json_data = user_data.model_dump(by_alias=True)
        
        assert "tenantId" in json_data
        assert "firstName" in json_data
        assert "lastName" in json_data
        assert "fullName" in json_data
        assert "isActive" in json_data
        assert "isPhoneVerified" in json_data
        
        # Should NOT have snake_case keys
        assert "tenant_id" not in json_data
        assert "first_name" not in json_data
        assert "last_name" not in json_data
    
    def test_required_fields(self):
        """AuthUserRead should require essential fields"""
        with pytest.raises(ValidationError):
            AuthUserRead(
                id="usr_123",
                # Missing tenant_id, email, etc.
            )


class TestLoginResponseSchema:
    """Test LoginResponse schema validation"""
    
    def test_valid_login_response(self):
        """LoginResponse should accept valid data"""
        user = AuthUserRead(
            id="usr_123",
            tenant_id="tenant_456",
            email="test@example.com",
            first_name="Test",
            last_name="User",
            full_name="Test User",
            role="user",
            is_active=True,
        )
        
        response = LoginResponse(
            access_token="eyJ...",
            refresh_token="eyJ...",
            user=user,
            requires_phone_verification=False,
        )
        
        assert response.access_token == "eyJ..."
        assert response.refresh_token == "eyJ..."
        assert response.user.id == "usr_123"
        assert response.requires_phone_verification is False
    
    def test_camel_case_serialization(self):
        """LoginResponse should serialize to camelCase"""
        user = AuthUserRead(
            id="usr_123",
            tenant_id="tenant_456",
            email="test@example.com",
            first_name="Test",
            last_name="User",
            full_name="Test User",
            role="user",
            is_active=True,
        )
        
        response = LoginResponse(
            access_token="eyJ...",
            refresh_token="eyJ...",
            user=user,
            requires_phone_verification=True,
        )
        
        json_data = response.model_dump(by_alias=True)
        
        assert "accessToken" in json_data
        assert "refreshToken" in json_data
        assert "requiresPhoneVerification" in json_data
        assert json_data["requiresPhoneVerification"] is True
        
        # User should also be camelCase
        assert "tenantId" in json_data["user"]
    
    def test_required_tokens(self):
        """LoginResponse should require both tokens"""
        user = AuthUserRead(
            id="usr_123",
            tenant_id="tenant_456",
            email="test@example.com",
            first_name="Test",
            last_name="User",
            full_name="Test User",
            role="user",
            is_active=True,
        )
        
        with pytest.raises(ValidationError):
            LoginResponse(
                access_token="eyJ...",
                # Missing refresh_token
                user=user,
            )


class TestLookupPhoneResponseSchema:
    """Test LookupPhoneResponse schema validation"""
    
    def test_valid_response(self):
        """LookupPhoneResponse should accept valid data"""
        response = LookupPhoneResponse(
            masked_phone="****1234",
            is_phone_input=False,
            user_exists=True,
        )
        
        assert response.masked_phone == "****1234"
        assert response.is_phone_input is False
        assert response.user_exists is True
    
    def test_camel_case_serialization(self):
        """LookupPhoneResponse should serialize to camelCase"""
        response = LookupPhoneResponse(
            masked_phone="****1234",
            is_phone_input=True,
            user_exists=True,
        )
        
        json_data = response.model_dump(by_alias=True)
        
        assert "maskedPhone" in json_data
        assert "isPhoneInput" in json_data
        assert "userExists" in json_data


class TestVerifyOtpResponseSchema:
    """Test VerifyOtpResponse schema validation"""
    
    def test_simple_verification(self):
        """VerifyOtpResponse should work without tokens"""
        response = VerifyOtpResponse(verified=True)
        
        assert response.verified is True
        assert response.access_token is None
        assert response.refresh_token is None
        assert response.user is None
    
    def test_full_verification_with_tokens(self):
        """VerifyOtpResponse should include tokens when authenticated"""
        user = AuthUserRead(
            id="usr_123",
            tenant_id="tenant_456",
            email="test@example.com",
            first_name="Test",
            last_name="User",
            full_name="Test User",
            role="user",
            is_active=True,
        )
        
        response = VerifyOtpResponse(
            verified=True,
            access_token="eyJ...",
            refresh_token="eyJ...",
            user=user,
        )
        
        assert response.verified is True
        assert response.access_token == "eyJ..."
        assert response.user.id == "usr_123"


class TestRefreshTokenResponseSchema:
    """Test RefreshTokenResponse schema validation"""
    
    def test_valid_response(self):
        """RefreshTokenResponse should accept valid data"""
        response = RefreshTokenResponse(access_token="eyJ...")
        
        assert response.access_token == "eyJ..."
    
    def test_camel_case_serialization(self):
        """RefreshTokenResponse should serialize to camelCase"""
        response = RefreshTokenResponse(access_token="eyJ...")
        
        json_data = response.model_dump(by_alias=True)
        
        assert "accessToken" in json_data
        assert json_data["accessToken"] == "eyJ..."


class TestResponseEnvelopeWithAuthSchemas:
    """Test ResponseEnvelope wrapping auth schemas"""
    
    def test_login_response_envelope(self):
        """ResponseEnvelope should properly wrap LoginResponse"""
        user = AuthUserRead(
            id="usr_123",
            tenant_id="tenant_456",
            email="test@example.com",
            first_name="Test",
            last_name="User",
            full_name="Test User",
            role="user",
            is_active=True,
        )
        
        login_data = LoginResponse(
            access_token="eyJ...",
            refresh_token="eyJ...",
            user=user,
            requires_phone_verification=False,
        )
        
        envelope = ResponseEnvelope(data=login_data)
        
        assert envelope.success is True
        assert envelope.data is not None
        assert envelope.data.access_token == "eyJ..."
    
    def test_envelope_serialization(self):
        """ResponseEnvelope should serialize nested data correctly"""
        response = LookupPhoneResponse(
            masked_phone="****1234",
            is_phone_input=False,
            user_exists=True,
        )
        
        envelope = ResponseEnvelope(data=response)
        json_data = envelope.model_dump(by_alias=True)
        
        assert json_data["success"] is True
        assert "data" in json_data
        assert json_data["data"]["maskedPhone"] == "****1234"


class TestRequestSchemas:
    """Test request schema validation"""
    
    def test_login_request(self):
        """LoginRequest should accept various identifier types"""
        # With identifier
        req1 = LoginRequest(identifier="testuser", password="secret123")
        assert req1.identifier == "testuser"
        
        # With email
        req2 = LoginRequest(email="test@example.com", password="secret123")
        assert req2.email == "test@example.com"
        
        # With phone
        req3 = LoginRequest(phone="+905551234567", password="secret123")
        assert req3.phone == "+905551234567"
    
    def test_reset_password_request_camel_case(self):
        """ResetPasswordRequest should accept camelCase input"""
        # Test with snake_case (internal)
        req = ResetPasswordRequest(
            identifier="+905551234567",
            otp="123456",
            new_password="newpassword123",
        )
        assert req.new_password == "newpassword123"
    
    def test_forgot_password_request_camel_case(self):
        """ForgotPasswordRequest should accept camelCase input"""
        from schemas.auth import ForgotPasswordRequest
        
        req = ForgotPasswordRequest(
            identifier="+905551234567",
            captcha_token="token123",
        )
        assert req.captcha_token == "token123"
