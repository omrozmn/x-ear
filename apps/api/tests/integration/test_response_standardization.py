
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone
from uuid import uuid4

from main import app

client = TestClient(app)

def test_health_endpoint_structure():
    """Verify health endpoint returns expected structure"""
    response = client.get("/health")
    assert response.status_code == 200
    
    data = response.json()
    
    # Health endpoint has its own simple structure
    assert "status" in data
    assert "timestamp" in data
    assert "version" in data
    
    assert data["status"] == "healthy"

def test_error_response_structure():
    """Verify error responses follow ResponseEnvelope structure"""
    # Test non-existent endpoint
    response = client.get("/api/nonexistent")
    assert response.status_code == 404
    
    data = response.json()
    
    # Verify ResponseEnvelope structure for errors
    assert "success" in data
    assert "data" in data
    assert "error" in data
    assert "meta" in data
    assert "requestId" in data
    assert "timestamp" in data
    
    assert data["success"] is False
    assert data["data"] is None
    assert data["error"] is not None
    
    # Verify error structure
    error = data["error"]
    assert "message" in error
    assert "code" in error

def test_camel_case_response_format():
    """Verify API responses use camelCase format"""
    # Test error response (which uses ResponseEnvelope)
    response = client.get("/api/nonexistent")
    assert response.status_code == 404
    
    data = response.json()
    
    # Verify camelCase keys in ResponseEnvelope
    assert "requestId" in data  # Not request_id
    assert "timestamp" in data  # Standard format
    
    # Should not contain snake_case in top level
    for key in data.keys():
        if key not in ["meta"]:  # meta might have snake_case internally
            assert "_" not in key or key.startswith("_"), f"Found snake_case key: {key}"

def test_response_envelope_structure():
    """Verify API endpoints use ResponseEnvelope structure"""
    # Test error response (guaranteed to use ResponseEnvelope)
    response = client.get("/api/nonexistent")
    assert response.status_code == 404
    
    data = response.json()
    
    # Verify ResponseEnvelope structure
    assert "success" in data
    assert "data" in data
    assert "error" in data
    assert "meta" in data
    assert "requestId" in data
    assert "timestamp" in data

def test_response_determinism():
    """Verify responses are deterministic (same input = same output)"""
    # Test same endpoint multiple times
    response1 = client.get("/health")
    response2 = client.get("/health")
    
    assert response1.status_code == response2.status_code
    
    # Remove timestamp for comparison (this should be different)
    data1 = response1.json()
    data2 = response2.json()
    
    # Remove dynamic fields
    for data in [data1, data2]:
        data.pop("timestamp", None)
    
    # Rest should be identical
    assert data1 == data2

def test_idempotency_key_header_handling():
    """Verify Idempotency-Key header is handled properly"""
    headers = {"Idempotency-Key": "test-key-123"}
    
    # GET request should ignore idempotency key
    response = client.get("/health", headers=headers)
    assert response.status_code == 200
    assert "X-Idempotency-Replayed" not in response.headers




