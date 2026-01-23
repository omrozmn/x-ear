"""
AI API Endpoints Integration Tests

Tests for verifying all AI API endpoints work correctly.
This is part of Checkpoint 19 - API Layer verification.

Requirements:
- 14.1: REST endpoints with OpenAPI documentation at /ai/*
- 14.4: Return structured error responses with actionable messages
"""

import os
import sys
from pathlib import Path

# Add the api directory to the path for imports
_api_dir = Path(__file__).resolve().parent.parent.parent
if str(_api_dir) not in sys.path:
    sys.path.insert(0, str(_api_dir))

# Set environment variables before importing app
os.environ.setdefault("AI_ENABLED", "true")
os.environ.setdefault("AI_PHASE", "C")  # Enable execution for testing
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing")

import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

# Import AI routers
from ai.api import (
    chat_router,
    actions_router,
    audit_router,
    status_router,
    admin_router,
)
from ai.services.kill_switch import KillSwitch, get_kill_switch


# =============================================================================
# Test App Setup
# =============================================================================

@pytest.fixture
def app(mock_auth_middleware, db_session):
    """Create a test FastAPI app with AI routers and authentication middleware."""
    from core.database import get_db
    
    test_app = FastAPI(title="AI Layer Test App")
    
    # Override get_db dependency to use test database session
    def override_get_db():
        try:
            yield db_session
        finally:
            pass  # Don't close - managed by fixture
    
    test_app.dependency_overrides[get_db] = override_get_db
    
    # Add mock authentication middleware
    @test_app.middleware("http")
    async def auth_middleware(request: Request, call_next):
        return await mock_auth_middleware(request, call_next)
    
    # Include all AI routers
    test_app.include_router(chat_router, prefix="/api")
    test_app.include_router(actions_router, prefix="/api")
    test_app.include_router(audit_router, prefix="/api")
    test_app.include_router(status_router, prefix="/api")
    test_app.include_router(admin_router, prefix="/api")
    
    return test_app


@pytest.fixture
def client(app):
    """Create a test client."""
    return TestClient(app)


@pytest.fixture(autouse=True)
def reset_kill_switch():
    """Reset kill switch before each test."""
    ks = get_kill_switch()
    ks.reset()
    yield
    ks.reset()


# =============================================================================
# Chat Endpoint Tests
# =============================================================================

class TestChatEndpoint:
    """Tests for POST /ai/chat endpoint."""
    
    def test_chat_endpoint_exists(self, client):
        """Chat endpoint should exist and accept POST requests."""
        response = client.post(
            "/api/ai/chat",
            json={"prompt": "Hello, how are you?"}
        )
        # Should not return 404 or 405
        assert response.status_code != 404
        assert response.status_code != 405
    
    def test_chat_requires_prompt(self, client):
        """Chat endpoint should require a prompt."""
        response = client.post("/api/ai/chat", json={})
        assert response.status_code == 422  # Validation error
    
    def test_chat_validates_prompt_length(self, client):
        """Chat endpoint should validate prompt length."""
        # Empty prompt should fail
        response = client.post("/api/ai/chat", json={"prompt": ""})
        assert response.status_code == 422
    
    def test_chat_returns_structured_response(self, client):
        """Chat endpoint should return structured response."""
        response = client.post(
            "/api/ai/chat",
            json={"prompt": "What is the status of my order?"}
        )
        # Even if AI is unavailable, should return structured error
        data = response.json()
        # Should have either success response or error response structure
        assert "request_id" in data or "error_code" in data or "detail" in data
    
    def test_chat_with_context(self, client):
        """Chat endpoint should accept optional context."""
        response = client.post(
            "/api/ai/chat",
            json={
                "prompt": "Continue our conversation",
                "context": {"previous_topic": "hearing aids"}
            }
        )
        # Should not fail due to context parameter
        assert response.status_code != 422
    
    def test_chat_with_idempotency_key(self, client):
        """Chat endpoint should accept idempotency key."""
        response = client.post(
            "/api/ai/chat",
            json={
                "prompt": "Test message",
                "idempotency_key": "test-key-123"
            }
        )
        # Should not fail due to idempotency_key parameter
        assert response.status_code != 422


# =============================================================================
# Actions Endpoint Tests
# =============================================================================

class TestActionsEndpoint:
    """Tests for /ai/actions endpoints."""
    
    def test_create_action_endpoint_exists(self, client):
        """Create action endpoint should exist."""
        response = client.post(
            "/api/ai/actions",
            json={
                "intent": {
                    "intent_type": "query",
                    "confidence": 0.9,
                    "entities": {}
                }
            }
        )
        # Should not return 404 or 405
        assert response.status_code != 404
        assert response.status_code != 405
    
    def test_create_action_requires_intent(self, client):
        """Create action should require intent."""
        response = client.post("/api/ai/actions", json={})
        assert response.status_code == 422
    
    def test_create_action_validates_intent_type(self, client):
        """Create action should validate intent type."""
        response = client.post(
            "/api/ai/actions",
            json={
                "intent": {
                    "intent_type": "invalid_type",
                    "confidence": 0.9,
                    "entities": {}
                }
            }
        )
        # Should return 400 for invalid intent type
        assert response.status_code == 400
    
    def test_get_action_endpoint_exists(self, client):
        """Get action endpoint should exist."""
        response = client.get("/api/ai/actions/test-action-id")
        # Should return 404 for non-existent action, not 405
        assert response.status_code == 404
    
    def test_approve_action_endpoint_exists(self, client):
        """Approve action endpoint should exist."""
        response = client.post(
            "/api/ai/actions/test-action-id/approve",
            json={"approval_token": "test-token"}
        )
        # Should return 404 for non-existent action, not 405
        assert response.status_code == 404
    
    def test_execute_action_endpoint_exists(self, client):
        """Execute action endpoint should exist."""
        response = client.post(
            "/api/ai/actions/test-action-id/execute",
            json={"mode": "simulate"}
        )
        # Should return 404 for non-existent action, not 405
        assert response.status_code == 404


# =============================================================================
# Audit Endpoint Tests
# =============================================================================

class TestAuditEndpoint:
    """Tests for /ai/audit endpoints."""
    
    def test_list_audit_logs_endpoint_exists(self, client):
        """List audit logs endpoint should exist."""
        response = client.get("/api/ai/audit")
        assert response.status_code == 200
    
    def test_list_audit_logs_returns_list(self, client):
        """List audit logs should return paginated list."""
        response = client.get("/api/ai/audit")
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert "has_more" in data
    
    def test_list_audit_logs_pagination(self, client):
        """List audit logs should support pagination."""
        response = client.get("/api/ai/audit?page=1&page_size=10")
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 10
    
    def test_list_audit_logs_filtering(self, client):
        """List audit logs should support filtering."""
        response = client.get("/api/ai/audit?event_type=request_received")
        assert response.status_code == 200
    
    def test_get_audit_entry_endpoint_exists(self, client):
        """Get audit entry endpoint should exist."""
        response = client.get("/api/ai/audit/test-audit-id")
        # Should return 404 for non-existent entry, not 405
        assert response.status_code == 404
    
    def test_get_audit_stats_endpoint_exists(self, client):
        """Get audit stats endpoint should exist."""
        response = client.get("/api/ai/audit/stats")
        assert response.status_code == 200


# =============================================================================
# Status Endpoint Tests
# =============================================================================

class TestStatusEndpoint:
    """Tests for /ai/status endpoints."""
    
    def test_status_endpoint_exists(self, client):
        """Status endpoint should exist."""
        response = client.get("/api/ai/status")
        assert response.status_code == 200
    
    def test_status_returns_complete_info(self, client):
        """Status endpoint should return complete status info."""
        response = client.get("/api/ai/status")
        data = response.json()
        
        # Check required fields
        assert "enabled" in data
        assert "available" in data
        assert "phase" in data
        assert "kill_switch" in data
        assert "usage" in data
        assert "model" in data
        assert "timestamp" in data
    
    def test_status_phase_info(self, client):
        """Status should include phase information."""
        response = client.get("/api/ai/status")
        data = response.json()
        
        phase = data["phase"]
        assert "current_phase" in phase
        assert "phase_name" in phase
        assert "execution_allowed" in phase
        assert "proposal_allowed" in phase
    
    def test_status_kill_switch_info(self, client):
        """Status should include kill switch information."""
        response = client.get("/api/ai/status")
        data = response.json()
        
        ks = data["kill_switch"]
        assert "global_active" in ks
        assert "tenant_active" in ks
        assert "capabilities_disabled" in ks
    
    def test_health_endpoint_exists(self, client):
        """Health endpoint should exist."""
        response = client.get("/api/ai/health")
        assert response.status_code == 200
    
    def test_health_returns_status(self, client):
        """Health endpoint should return health status."""
        response = client.get("/api/ai/health")
        data = response.json()
        
        assert "status" in data
        assert "ai_enabled" in data
        assert "model_available" in data
        assert "kill_switch_active" in data
        assert "timestamp" in data
    
    def test_capabilities_endpoint_exists(self, client):
        """Capabilities endpoint should exist."""
        response = client.get("/api/ai/capabilities")
        assert response.status_code == 200
    
    def test_capabilities_returns_list(self, client):
        """Capabilities endpoint should return capabilities list."""
        response = client.get("/api/ai/capabilities")
        data = response.json()
        
        assert "capabilities" in data
        assert "phase" in data
        assert "execution_allowed" in data


# =============================================================================
# Admin Endpoint Tests
# =============================================================================

class TestAdminEndpoint:
    """Tests for /ai/admin endpoints."""
    
    def test_kill_switch_get_endpoint_exists(self, client):
        """Get kill switch status endpoint should exist."""
        response = client.get("/api/ai/admin/kill-switch")
        assert response.status_code == 200
    
    def test_kill_switch_get_returns_status(self, client):
        """Get kill switch should return complete status."""
        response = client.get("/api/ai/admin/kill-switch")
        data = response.json()
        
        assert "global_switch" in data
        assert "tenant_switches" in data
        assert "capability_switches" in data
        assert "any_active" in data
    
    def test_kill_switch_post_endpoint_exists(self, client):
        """Post kill switch endpoint should exist."""
        response = client.post(
            "/api/ai/admin/kill-switch",
            json={
                "action": "activate",
                "scope": "global",
                "reason": "Test activation"
            }
        )
        # Should not return 404 or 405
        assert response.status_code != 404
        assert response.status_code != 405
    
    def test_kill_switch_activate_global(self, client):
        """Should be able to activate global kill switch."""
        response = client.post(
            "/api/ai/admin/kill-switch",
            json={
                "action": "activate",
                "scope": "global",
                "reason": "Test activation"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["active"] is True
    
    def test_kill_switch_deactivate_global(self, client):
        """Should be able to deactivate global kill switch."""
        # First activate
        client.post(
            "/api/ai/admin/kill-switch",
            json={
                "action": "activate",
                "scope": "global",
                "reason": "Test"
            }
        )
        
        # Then deactivate
        response = client.post(
            "/api/ai/admin/kill-switch",
            json={
                "action": "deactivate",
                "scope": "global"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["active"] is False
    
    def test_kill_switch_requires_reason_for_activation(self, client):
        """Activation should require a reason."""
        response = client.post(
            "/api/ai/admin/kill-switch",
            json={
                "action": "activate",
                "scope": "global"
                # Missing reason
            }
        )
        assert response.status_code == 400
    
    def test_pending_approvals_endpoint_exists(self, client):
        """Pending approvals endpoint should exist."""
        response = client.get("/api/ai/admin/pending-approvals")
        assert response.status_code == 200
    
    def test_pending_approvals_returns_list(self, client):
        """Pending approvals should return list."""
        response = client.get("/api/ai/admin/pending-approvals")
        data = response.json()
        
        assert "items" in data
        assert "total" in data
    
    def test_cleanup_expired_endpoint_exists(self, client):
        """Cleanup expired endpoint should exist."""
        response = client.post("/api/ai/admin/cleanup-expired")
        assert response.status_code == 200
    
    def test_settings_endpoint_exists(self, client):
        """Settings endpoint should exist."""
        response = client.get("/api/ai/admin/settings")
        assert response.status_code == 200
    
    def test_settings_returns_config(self, client):
        """Settings should return AI configuration."""
        response = client.get("/api/ai/admin/settings")
        data = response.json()
        
        assert "enabled" in data
        assert "phase" in data
        assert "model_provider" in data
        assert "model_id" in data


# =============================================================================
# Error Response Tests
# =============================================================================

class TestErrorResponses:
    """Tests for structured error responses."""
    
    def test_validation_error_format(self, client):
        """Validation errors should have proper format."""
        response = client.post("/api/ai/chat", json={})
        assert response.status_code == 422
        data = response.json()
        # FastAPI validation error format
        assert "detail" in data
    
    def test_not_found_error_format(self, client):
        """Not found errors should have proper format."""
        response = client.get("/api/ai/actions/nonexistent-id")
        assert response.status_code == 404
        data = response.json()
        # Should have error structure
        assert "detail" in data
    
    def test_invalid_request_error_format(self, client):
        """Invalid request errors should have proper format."""
        response = client.post(
            "/api/ai/admin/kill-switch",
            json={
                "action": "invalid_action",
                "scope": "global"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data


# =============================================================================
# OpenAPI Documentation Tests
# =============================================================================

class TestOpenAPIDocumentation:
    """Tests for OpenAPI documentation."""
    
    def test_openapi_schema_available(self, client):
        """OpenAPI schema should be available."""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        data = response.json()
        assert "openapi" in data
        assert "paths" in data
    
    def test_ai_endpoints_in_openapi(self, client):
        """AI endpoints should be documented in OpenAPI."""
        response = client.get("/openapi.json")
        data = response.json()
        paths = data["paths"]
        
        # Check key AI endpoints are documented
        assert "/api/ai/chat" in paths
        assert "/api/ai/actions" in paths
        assert "/api/ai/audit" in paths
        assert "/api/ai/status" in paths
        assert "/api/ai/health" in paths
    
    def test_ai_endpoints_have_operations(self, client):
        """AI endpoints should have proper HTTP operations defined."""
        response = client.get("/openapi.json")
        data = response.json()
        paths = data["paths"]
        
        # Check that endpoints have proper operations
        assert "post" in paths["/api/ai/chat"]
        assert "post" in paths["/api/ai/actions"]
        assert "get" in paths["/api/ai/audit"]
        assert "get" in paths["/api/ai/status"]
        assert "get" in paths["/api/ai/health"]


# =============================================================================
# Integration Tests
# =============================================================================

class TestEndpointIntegration:
    """Integration tests for endpoint interactions."""
    
    def test_kill_switch_affects_chat(self, client):
        """Activating kill switch should affect chat endpoint."""
        # Activate global kill switch
        client.post(
            "/api/ai/admin/kill-switch",
            json={
                "action": "activate",
                "scope": "global",
                "reason": "Test"
            }
        )
        
        # Chat should be unavailable
        response = client.post(
            "/api/ai/chat",
            json={"prompt": "Test message"}
        )
        assert response.status_code == 503
    
    def test_status_reflects_kill_switch(self, client):
        """Status should reflect kill switch state."""
        # Check initial status
        response = client.get("/api/ai/status")
        data = response.json()
        assert data["kill_switch"]["global_active"] is False
        
        # Activate kill switch
        client.post(
            "/api/ai/admin/kill-switch",
            json={
                "action": "activate",
                "scope": "global",
                "reason": "Test"
            }
        )
        
        # Check updated status
        response = client.get("/api/ai/status")
        data = response.json()
        assert data["kill_switch"]["global_active"] is True
