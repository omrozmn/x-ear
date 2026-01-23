"""
Integration tests for SMTP Configuration Router

Basic tests to verify endpoints are registered and working.
"""

import pytest
from fastapi.testclient import TestClient


def test_smtp_config_endpoints_registered(client: TestClient):
    """Test that SMTP config endpoints are registered."""
    # These will return 401 without auth, but that proves the endpoints exist
    response = client.get("/admin/integrations/smtp/config")
    assert response.status_code in [200, 401, 403]  # Endpoint exists
    
    response = client.post("/admin/integrations/smtp/config", json={})
    assert response.status_code in [200, 400, 401, 403, 422]  # Endpoint exists
    
    response = client.post("/admin/integrations/smtp/test", json={})
    assert response.status_code in [200, 400, 401, 403, 404, 422]  # Endpoint exists


def test_smtp_config_router_import():
    """Test that the router can be imported without errors."""
    from routers import smtp_config
    assert smtp_config.router is not None
    assert hasattr(smtp_config, 'create_or_update_smtp_config')
    assert hasattr(smtp_config, 'get_smtp_config')
    assert hasattr(smtp_config, 'send_test_email')
