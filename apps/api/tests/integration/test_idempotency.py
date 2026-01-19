import pytest
import hashlib
import json
import os
from uuid import uuid4
import random

# Enable idempotency middleware for these tests
os.environ["ENABLE_IDEMPOTENCY_TESTS"] = "true"

# Assuming standard test fixtures for client and db_session are available
# Adjust imports based on actual test suite structure
from fastapi.testclient import TestClient
from main import app
from core.models.idempotency import IdempotencyKey

client = TestClient(app)

def test_idempotent_replay_success(test_db, auth_headers):
    """G-04: Same Key + Same Body -> Cached Response (200)"""
    key = str(uuid4())
    phone = f"555{random.randint(1000000, 9999999)}"  # Unique phone
    payload = {"firstName": "Test", "lastName": "Party", "phone": phone}
    headers = {**auth_headers, "Idempotency-Key": key}
    
    # 1. First Request
    response1 = client.post("/api/parties", json=payload, headers=headers)
    print(f"First response: {response1.status_code}, {response1.text}")
    assert response1.status_code in (200, 201), f"First request failed: {response1.text}"
    data1 = response1.json()
    
    # 2. Replay Request
    response2 = client.post("/api/parties", json=payload, headers=headers)
    print(f"Second response: {response2.status_code}, {response2.text}")
    print(f"Second response headers: {dict(response2.headers)}")
    assert response2.status_code == response1.status_code
    assert response2.json() == data1
    assert response2.headers.get("X-Idempotency-Replayed") == "true"

def test_idempotent_conflict_mismatch(test_db, auth_headers):
    """G-04: Same Key + Different Body -> Conflict (422)"""
    key = str(uuid4())
    headers = {**auth_headers, "Idempotency-Key": key}
    
    # 1. First Request
    phone1 = f"555{random.randint(1000000, 9999999)}"  # Unique phone
    payload1 = {"firstName": "Test", "lastName": "Party1", "phone": phone1}
    response1 = client.post("/api/parties", json=payload1, headers=headers)
    assert response1.status_code in (200, 201), f"First request failed: {response1.text}"
    
    # 2. Mismatched Request
    phone2 = f"555{random.randint(1000000, 9999999)}"  # Different phone
    payload2 = {"firstName": "Test", "lastName": "Party2", "phone": phone2}  # Different body
    response2 = client.post("/api/parties", json=payload2, headers=headers)
    
    # Expecting 422 Unprocessable Entity due to hash mismatch
    assert response2.status_code == 422, f"Expected 422, got {response2.status_code}: {response2.text}"
    assert response2.json()["error"]["code"] == "IDEMPOTENCY_KEY_REUSED"

def test_idempotency_ignored_on_get():
    """G-04: GET requests should ignore Idempotency-Key"""
    key = str(uuid4())
    headers = {"Idempotency-Key": key}
    
    # GET request
    response = client.get("/health", headers=headers)
    assert response.status_code == 200
    
    # Should NOT satisfy any db constraint or create a record usually
    # (Implementation detail: middleware returns early)
    assert "X-Idempotency-Replayed" not in response.headers
