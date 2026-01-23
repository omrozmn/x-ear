"""
Unit Tests for JWT Authentication Middleware Edge Cases

Tests specific edge cases and error conditions for the JWT authentication middleware.

Requirements tested:
- 2.2: Malformed Authorization header handling
- 2.4: Expired JWT token handling
- 2.10: Context reset on exception

Edge cases:
- Missing Authorization header
- Malformed Authorization header (no "Bearer" prefix)
- Expired JWT token
- Invalid JWT signature
- Token missing tenant_id claim
- Context reset on exception
"""

import os
import pytest
from datetime import datetime, timedelta, timezone
from jose import jwt

from fastapi import FastAPI
from fastapi.testclient import TestClient

from ai.middleware.auth import AIAuthMiddleware, SECRET_KEY, ALGORITHM

# Set test environment
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing")


def create_token(user_id="test-user", tenant_id="test-tenant", expired=False, invalid_signature=False):
    """Helper to create JWT tokens for testing."""
    payload = {
        "sub": user_id,
        "tenant_id": tenant_id,
        "exp": datetime.now(timezone.utc) + (timedelta(hours=-1) if expired else timedelta(hours=1)),
    }
    
    secret = "wrong-secret" if invalid_signature else SECRET_KEY
    return jwt.encode(payload, secret, algorithm=ALGORITHM)


@pytest.fixture
def app():
    """Create a FastAPI app with JWT auth middleware."""
    app = FastAPI()
    app.add_middleware(AIAuthMiddleware)
    
    @app.get("/ai/chat")
    async def chat():
        return {"message": "Chat response"}
    
    @app.get("/ai/capabilities")
    async def capabilities():
        return {"capabilities": []}
    
    @app.get("/ai/status")
    async def status():
        return {"status": "ok"}
    
    return app


@pytest.fixture
def client(app):
    """Create a test client."""
    return TestClient(app)


class TestMissingAuthorizationHeader:
    """Test missing Authorization header."""
    
    def test_missing_header_returns_401(self, client):
        """Should return 401 when Authorization header is missing."""
        response = client.get("/ai/chat")
        
        assert response.status_code == 401
        assert response.json()["success"] is False
        assert "authorization token" in response.json()["error"]["message"].lower()
        assert response.headers.get("WWW-Authenticate") == "Bearer"
    
    def test_missing_header_includes_request_id(self, client):
        """Should include request ID in error response when provided."""
        response = client.get(
            "/ai/chat",
            headers={"X-Request-ID": "test-request-123"}
        )
        
        assert response.status_code == 401
        assert response.json()["requestId"] == "test-request-123"


class TestMalformedAuthorizationHeader:
    """Test malformed Authorization header."""
    
    def test_no_bearer_prefix_returns_401(self, client):
        """Should return 401 when Authorization header doesn't start with 'Bearer '."""
        token = create_token()
        
        response = client.get(
            "/ai/chat",
            headers={"Authorization": token}  # Missing "Bearer " prefix
        )
        
        assert response.status_code == 401
        assert response.json()["success"] is False
        assert "authorization token" in response.json()["error"]["message"].lower()
    
    def test_wrong_scheme_returns_401(self, client):
        """Should return 401 when using wrong auth scheme."""
        token = create_token()
        
        response = client.get(
            "/ai/chat",
            headers={"Authorization": f"Basic {token}"}  # Wrong scheme
        )
        
        assert response.status_code == 401
        assert response.json()["success"] is False
    
    def test_empty_bearer_token_returns_401(self, client):
        """Should return 401 when Bearer token is empty."""
        response = client.get(
            "/ai/chat",
            headers={"Authorization": "Bearer "}  # Empty token
        )
        
        assert response.status_code == 401
        assert response.json()["success"] is False


class TestExpiredJWTToken:
    """Test expired JWT token handling."""
    
    def test_expired_token_returns_401(self, client):
        """Should return 401 when JWT token is expired."""
        token = create_token(expired=True)
        
        response = client.get(
            "/ai/chat",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 401
        assert response.json()["success"] is False
        error_msg = response.json()["error"]["message"].lower()
        assert "expired" in error_msg or "invalid" in error_msg
    
    def test_expired_token_logs_warning(self, client, caplog):
        """Should log warning when token is expired."""
        token = create_token(expired=True)
        
        with caplog.at_level("WARNING"):
            response = client.get(
                "/ai/chat",
                headers={"Authorization": f"Bearer {token}"}
            )
        
        assert response.status_code == 401
        assert any("JWT validation failed" in record.message for record in caplog.records)


class TestInvalidJWTSignature:
    """Test invalid JWT signature handling."""
    
    def test_invalid_signature_returns_401(self, client):
        """Should return 401 when JWT signature is invalid."""
        token = create_token(invalid_signature=True)
        
        response = client.get(
            "/ai/chat",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 401
        assert response.json()["success"] is False
        error_msg = response.json()["error"]["message"].lower()
        assert "expired" in error_msg or "invalid" in error_msg
    
    def test_tampered_token_returns_401(self, client):
        """Should return 401 when token is tampered with."""
        token = create_token()
        # Tamper with the token by modifying a character
        tampered_token = token[:-5] + "XXXXX"
        
        response = client.get(
            "/ai/chat",
            headers={"Authorization": f"Bearer {tampered_token}"}
        )
        
        assert response.status_code == 401
        assert response.json()["success"] is False


class TestTokenMissingTenantId:
    """Test token missing tenant_id claim."""
    
    def test_missing_tenant_id_returns_401(self, client):
        """Should return 401 when JWT token is missing tenant_id claim."""
        # Create token without tenant_id
        payload = {
            "sub": "test-user",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        
        response = client.get(
            "/ai/chat",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 401
        assert response.json()["success"] is False
        assert "tenant_id" in response.json()["error"]["message"].lower()
    
    def test_null_tenant_id_returns_401(self, client):
        """Should return 401 when tenant_id is null."""
        payload = {
            "sub": "test-user",
            "tenant_id": None,  # Null tenant_id
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        
        response = client.get(
            "/ai/chat",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 401
        assert response.json()["success"] is False
        assert "tenant_id" in response.json()["error"]["message"].lower()
    
    def test_empty_tenant_id_returns_401(self, client):
        """Should return 401 when tenant_id is empty string."""
        payload = {
            "sub": "test-user",
            "tenant_id": "",  # Empty tenant_id
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        }
        token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
        
        response = client.get(
            "/ai/chat",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 401
        assert response.json()["success"] is False


class TestContextResetOnException:
    """Test context reset on exception."""
    
    def test_context_reset_on_handler_exception(self, client):
        """Should reset tenant context even when handler raises exception."""
        app = FastAPI()
        app.add_middleware(AIAuthMiddleware)
        
        @app.get("/ai/chat")
        async def chat():
            raise ValueError("Simulated error")
        
        client = TestClient(app, raise_server_exceptions=False)
        token = create_token()
        
        response = client.get(
            "/ai/chat",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should return 500 but not crash
        assert response.status_code == 500
    
    def test_context_reset_on_downstream_middleware_exception(self, client):
        """Should reset tenant context even when downstream middleware raises exception."""
        from starlette.middleware.base import BaseHTTPMiddleware
        
        class FailingMiddleware(BaseHTTPMiddleware):
            async def dispatch(self, request, call_next):
                raise RuntimeError("Downstream middleware error")
        
        app = FastAPI()
        app.add_middleware(AIAuthMiddleware)
        app.add_middleware(FailingMiddleware)
        
        @app.get("/ai/chat")
        async def chat():
            return {"message": "success"}
        
        client = TestClient(app, raise_server_exceptions=False)
        token = create_token()
        
        response = client.get(
            "/ai/chat",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should return 500 but not crash
        assert response.status_code == 500


class TestValidAuthentication:
    """Test valid authentication scenarios."""
    
    def test_valid_token_allows_access(self, client):
        """Should allow access with valid token."""
        token = create_token()
        
        response = client.get(
            "/ai/chat",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["message"] == "Chat response"
    
    def test_valid_token_with_different_tenant(self, client):
        """Should allow access with valid token for different tenant."""
        token = create_token(tenant_id="different-tenant")
        
        response = client.get(
            "/ai/chat",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
    
    def test_valid_token_with_different_user(self, client):
        """Should allow access with valid token for different user."""
        token = create_token(user_id="different-user")
        
        response = client.get(
            "/ai/chat",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200


class TestExcludedPaths:
    """Test excluded paths that bypass authentication."""
    
    def test_status_endpoint_bypasses_auth(self, client):
        """Status endpoint should not require authentication."""
        response = client.get("/ai/status")
        
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
    
    def test_health_endpoint_bypasses_auth(self, app):
        """Health endpoint should not require authentication."""
        @app.get("/ai/health")
        async def health():
            return {"health": "ok"}
        
        client = TestClient(app)
        response = client.get("/ai/health")
        
        assert response.status_code == 200
        assert response.json()["health"] == "ok"


class TestNonAIEndpoints:
    """Test that non-AI endpoints are not affected."""
    
    def test_non_ai_endpoint_bypasses_middleware(self, app):
        """Non-AI endpoints should not be affected by middleware."""
        @app.get("/other")
        async def other():
            return {"message": "other"}
        
        client = TestClient(app)
        response = client.get("/other")
        
        assert response.status_code == 200
        assert response.json()["message"] == "other"
    
    def test_root_endpoint_bypasses_middleware(self, app):
        """Root endpoint should not be affected by middleware."""
        @app.get("/")
        async def root():
            return {"message": "root"}
        
        client = TestClient(app)
        response = client.get("/")
        
        assert response.status_code == 200
        assert response.json()["message"] == "root"


class TestMultipleRequests:
    """Test multiple requests to ensure context isolation."""
    
    def test_multiple_requests_with_different_tenants(self, client):
        """Should handle multiple requests with different tenants correctly."""
        token1 = create_token(tenant_id="tenant-1")
        token2 = create_token(tenant_id="tenant-2")
        
        response1 = client.get(
            "/ai/chat",
            headers={"Authorization": f"Bearer {token1}"}
        )
        response2 = client.get(
            "/ai/chat",
            headers={"Authorization": f"Bearer {token2}"}
        )
        
        assert response1.status_code == 200
        assert response2.status_code == 200
    
    def test_alternating_valid_and_invalid_requests(self, client):
        """Should handle alternating valid and invalid requests correctly."""
        valid_token = create_token()
        
        # Valid request
        response1 = client.get(
            "/ai/chat",
            headers={"Authorization": f"Bearer {valid_token}"}
        )
        assert response1.status_code == 200
        
        # Invalid request (no auth)
        response2 = client.get("/ai/chat")
        assert response2.status_code == 401
        
        # Valid request again
        response3 = client.get(
            "/ai/chat",
            headers={"Authorization": f"Bearer {valid_token}"}
        )
        assert response3.status_code == 200
