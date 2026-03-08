#!/usr/bin/env python3
"""Test admin permission middleware"""
import requests
import jwt

# Generate a test JWT token with ADMIN role
SECRET_KEY = 'super-secret-jwt-key-for-development'

import time

payload = {
    "sub": "usr_03af7519",
    "tenant_id": "tenant_001",
    "role": "ADMIN",
    "role_permissions": ["*"],
    "exp": int(time.time()) + 3600
}

token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")

print(f"Generated token: {token[:50]}...")
print(f"Payload: {payload}")

# Test the endpoint
response = requests.post(
    "http://localhost:5003/api/admin/tenants",
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Idempotency-Key": "test-123"
    },
    json={
        "name": "Test Clinic",
        "ownerEmail": "test@example.com",
        "status": "trial",
        "productCode": "xear_hearing"
    }
)

print(f"\nResponse status: {response.status_code}")
print(f"Response body: {response.text}")
