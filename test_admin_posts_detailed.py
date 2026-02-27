#!/usr/bin/env python3
"""Test admin POST endpoints with detailed error reporting"""
import requests
import json

# Login first
response = requests.post(
    "http://localhost:5003/api/auth/login",
    json={"email": "admin@x-ear.com", "password": "admin123"},
    headers={"Idempotency-Key": "test-login"}
)
token = response.json()["data"]["accessToken"]
headers = {"Authorization": f"Bearer {token}", "Idempotency-Key": "test-post"}

# Get OpenAPI spec
openapi = requests.get("http://localhost:5003/openapi.json").json()

# Test a few endpoints with detailed error output
test_endpoints = [
    ("/api/admin/settings/init-db", {}),
    ("/api/admin/settings/cache/clear", {}),
    ("/api/admin/debug/exit-impersonation", {}),
    ("/api/admin/roles", {"name": "Test Role", "description": "Test"}),
    ("/api/admin/sms/packages", {"name": "Test", "smsCount": 1000, "price": 49.99, "isActive": True}),
]

for path, body in test_endpoints:
    print(f"\n{'='*60}")
    print(f"Testing: POST {path}")
    print(f"Body: {json.dumps(body, indent=2)}")
    
    try:
        resp = requests.post(
            f"http://localhost:5003{path}",
            headers=headers,
            json=body,
            timeout=5
        )
        
        print(f"Status: {resp.status_code}")
        
        try:
            data = resp.json()
            print(f"Response: {json.dumps(data, indent=2)}")
        except:
            print(f"Response (text): {resp.text[:200]}")
            
    except Exception as e:
        print(f"ERROR: {e}")
