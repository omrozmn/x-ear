"""
Tests for Kill Switch Middleware

Tests the FastAPI middleware that checks kill switch status on every request.

Requirements tested:
- 15.4: WHEN Kill_Switch is activated, reject all new requests immediately
"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from starlette.responses import Response

from ai.middleware.kill_switch_middleware import (
    KillSwitchMiddleware,
    create_kill_switch_dependency,
    require_chat_enabled,
    require_actions_enabled,
    require_ocr_enabled,
    require_ai_enabled,
    _extract_tenant_id,
    _extract_capability,
)
from ai.services.kill_switch import (
    KillSwitch,
    AICapability,
    reset_kill_switch,
)


@pytest.fixture(autouse=True)
def reset_kill_switch_fixture():
    """Reset kill switch before and after each test."""
    reset_kill_switch()
    yield
    reset_kill_switch()


@pytest.fixture
def app_with_middleware():
    """Create a FastAPI app with kill switch middleware."""
    app = FastAPI()
    app.add_middleware(KillSwitchMiddleware)
    
    @app.get("/ai/chat")
    async def chat():
        return {"message": "Chat response"}
    
    @app.get("/ai/actions")
    async def actions():
        return {"message": "Actions response"}
    
    @app.get("/ai/ocr")
    async def ocr():
        return {"message": "OCR response"}
    
    @app.get("/ai/status")
    async def status():
        return {"status": "ok"}
    
    @app.get("/other")
    async def other():
        return {"message": "Other response"}
    
    return app


@pytest.fixture
def client(app_with_middleware):
    """Create a test client."""
    return TestClient(app_with_middleware)


class TestKillSwitchMiddleware:
    """Tests for the middleware."""
    
    def test_passes_when_inactive(self, client):
        """Should pass requests when kill switch inactive."""
        response = client.get("/ai/chat")
        assert response.status_code == 200
        assert response.json()["message"] == "Chat response"
    
    def test_blocks_when_global_active(self, client):
        """Should block all AI requests when global kill switch active."""
        ks = KillSwitch.get()
        ks.activate_global("admin", "Emergency maintenance")
        
        response = client.get("/ai/chat")
        
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "AI_DISABLED"
        assert "Emergency maintenance" in response.json()["error"]["details"]["reason"]
    
    def test_blocks_specific_capability(self, client):
        """Should block specific capability when its kill switch active."""
        ks = KillSwitch.get()
        ks.activate_capability(AICapability.CHAT, "admin", "Chat issue")
        
        # Chat should be blocked
        response = client.get("/ai/chat")
        assert response.status_code == 503
        
        # Actions should still work
        response = client.get("/ai/actions")
        assert response.status_code == 200
    
    def test_blocks_tenant_specific(self, client):
        """Should block specific tenant when its kill switch active."""
        ks = KillSwitch.get()
        ks.activate_tenant("tenant-1", "admin", "Abuse detected")
        
        # Request with tenant-1 header should be blocked
        response = client.get(
            "/ai/chat",
            headers={"X-Tenant-ID": "tenant-1"},
        )
        assert response.status_code == 503
        
        # Request with tenant-2 header should pass
        response = client.get(
            "/ai/chat",
            headers={"X-Tenant-ID": "tenant-2"},
        )
        assert response.status_code == 200
    
    def test_excludes_status_endpoint(self, client):
        """Should not block status endpoint even when kill switch active."""
        ks = KillSwitch.get()
        ks.activate_global("admin", "Emergency")
        
        response = client.get("/ai/status")
        assert response.status_code == 200
    
    def test_does_not_affect_non_ai_endpoints(self, client):
        """Should not affect non-AI endpoints."""
        ks = KillSwitch.get()
        ks.activate_global("admin", "Emergency")
        
        response = client.get("/other")
        assert response.status_code == 200
    
    def test_response_headers(self, client):
        """Should include appropriate headers in 503 response."""
        ks = KillSwitch.get()
        ks.activate_global("admin", "Emergency")
        
        response = client.get("/ai/chat")
        
        assert response.status_code == 503
        assert "Retry-After" in response.headers
        assert response.headers["X-AI-Kill-Switch"] == "active"


class TestExtractTenantId:
    """Tests for tenant ID extraction."""
    
    def test_extract_from_header(self):
        """Should extract tenant ID from header."""
        request = MagicMock(spec=Request)
        request.state = MagicMock()
        del request.state.tenant_id  # Simulate no state
        request.headers = {"X-Tenant-ID": "tenant-123"}
        request.query_params = {}
        
        # Mock hasattr to return False for tenant_id
        with patch("ai.middleware.kill_switch_middleware.hasattr", return_value=False):
            tenant_id = _extract_tenant_id(request)
        
        assert tenant_id == "tenant-123"
    
    def test_extract_from_query_param(self):
        """Should extract tenant ID from query parameter."""
        request = MagicMock(spec=Request)
        request.state = MagicMock()
        del request.state.tenant_id
        request.headers = {}
        request.query_params = {"tenant_id": "tenant-456"}
        
        with patch("ai.middleware.kill_switch_middleware.hasattr", return_value=False):
            tenant_id = _extract_tenant_id(request)
        
        assert tenant_id == "tenant-456"
    
    def test_returns_none_when_not_found(self):
        """Should return None when tenant ID not found."""
        request = MagicMock(spec=Request)
        request.state = MagicMock()
        del request.state.tenant_id
        request.headers = {}
        request.query_params = {}
        
        with patch("ai.middleware.kill_switch_middleware.hasattr", return_value=False):
            tenant_id = _extract_tenant_id(request)
        
        assert tenant_id is None


class TestExtractCapability:
    """Tests for capability extraction from path."""
    
    def test_extract_chat(self):
        """Should extract CHAT capability from path."""
        request = MagicMock(spec=Request)
        request.url = MagicMock()
        request.url.path = "/ai/chat/send"
        
        capability = _extract_capability(request)
        assert capability == AICapability.CHAT
    
    def test_extract_actions(self):
        """Should extract ACTIONS capability from path."""
        request = MagicMock(spec=Request)
        request.url = MagicMock()
        request.url.path = "/ai/actions/execute"
        
        capability = _extract_capability(request)
        assert capability == AICapability.ACTIONS
    
    def test_extract_ocr(self):
        """Should extract OCR capability from path."""
        request = MagicMock(spec=Request)
        request.url = MagicMock()
        request.url.path = "/ai/ocr/process"
        
        capability = _extract_capability(request)
        assert capability == AICapability.OCR
    
    def test_returns_none_for_unknown(self):
        """Should return None for unknown paths."""
        request = MagicMock(spec=Request)
        request.url = MagicMock()
        request.url.path = "/ai/other"
        
        capability = _extract_capability(request)
        assert capability is None


class TestKillSwitchDependency:
    """Tests for FastAPI dependency."""
    
    @pytest.fixture
    def app_with_dependency(self):
        """Create app using dependency instead of middleware."""
        from fastapi import Depends
        
        app = FastAPI()
        
        @app.get("/ai/chat")
        async def chat(_: None = Depends(require_chat_enabled)):
            return {"message": "Chat response"}
        
        @app.get("/ai/actions")
        async def actions(_: None = Depends(require_actions_enabled)):
            return {"message": "Actions response"}
        
        return app
    
    def test_dependency_passes_when_inactive(self, app_with_dependency):
        """Dependency should pass when kill switch inactive."""
        client = TestClient(app_with_dependency)
        response = client.get("/ai/chat")
        assert response.status_code == 200
    
    def test_dependency_blocks_when_active(self, app_with_dependency):
        """Dependency should block when kill switch active."""
        ks = KillSwitch.get()
        ks.activate_capability(AICapability.CHAT, "admin", "Test")
        
        client = TestClient(app_with_dependency)
        response = client.get("/ai/chat")
        
        assert response.status_code == 503
    
    def test_dependency_specific_to_capability(self, app_with_dependency):
        """Dependency should only block its specific capability."""
        ks = KillSwitch.get()
        ks.activate_capability(AICapability.CHAT, "admin", "Test")
        
        client = TestClient(app_with_dependency)
        
        # Chat should be blocked
        response = client.get("/ai/chat")
        assert response.status_code == 503
        
        # Actions should pass
        response = client.get("/ai/actions")
        assert response.status_code == 200
