#!/usr/bin/env python3
"""Auto-test all 513 API endpoints"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:5003"

# Get tokens
print("Getting tokens...")
admin_resp = requests.post(f"{BASE_URL}/api/admin/auth/login", 
    json={"email": "admin@test.com", "password": "admin123"},
    headers={"Idempotency-Key": f"adm-{datetime.now().timestamp()}"})
ADMIN_TOKEN = admin_resp.json().get("data", {}).get("token", "")

tenant_resp = requests.post(f"{BASE_URL}/api/auth/login",
    json={"phone": "+905551234567", "password": "test123"},
    headers={"Idempotency-Key": f"ten-{datetime.now().timestamp()}"})
TENANT_TOKEN = tenant_resp.json().get("data", {}).get("accessToken", "")

if not ADMIN_TOKEN or not TENANT_TOKEN:
    print("❌ Failed to get tokens")
    exit(1)

print("✅ Tokens obtained\n")

# Get OpenAPI spec
spec_resp = requests.get(f"{BASE_URL}/openapi.json")
spec = spec_resp.json()

paths = spec.get("paths", {})
total = 0
passed = 0
failed = 0

print(f"Testing {sum(len(m) for m in paths.values())} operations...\n")

for path, methods in paths.items():
    for method, details in methods.items():
        if method.lower() not in ["get", "post", "put", "patch", "delete"]:
            continue
            
        total += 1
        operation_id = details.get("operationId", "unknown")
        
        # Choose token based on path
        token = ADMIN_TOKEN if "/admin/" in path else TENANT_TOKEN
        
        # Skip if path has parameters
        if "{" in path:
            print(f"⊘ {method.upper()} {path} (has params)")
            continue
        
        try:
            headers = {
                "Authorization": f"Bearer {token}",
                "Idempotency-Key": f"test-{datetime.now().timestamp()}"
            }
            
            if method.lower() == "get":
                resp = requests.get(f"{BASE_URL}{path}", headers=headers, timeout=5)
            elif method.lower() == "post":
                resp = requests.post(f"{BASE_URL}{path}", headers=headers, json={}, timeout=5)
            elif method.lower() == "put":
                resp = requests.put(f"{BASE_URL}{path}", headers=headers, json={}, timeout=5)
            elif method.lower() == "patch":
                resp = requests.patch(f"{BASE_URL}{path}", headers=headers, json={}, timeout=5)
            elif method.lower() == "delete":
                resp = requests.delete(f"{BASE_URL}{path}", headers=headers, timeout=5)
            
            if resp.status_code in [200, 201, 204]:
                passed += 1
                print(f"✓ {method.upper()} {path} ({resp.status_code})")
            else:
                failed += 1
                print(f"✗ {method.upper()} {path} ({resp.status_code})")
                
        except Exception as e:
            failed += 1
            print(f"✗ {method.upper()} {path} (error: {str(e)[:50]})")

print(f"\n=== Results ===")
print(f"PASS: {passed}")
print(f"FAIL: {failed}")
print(f"Total: {total}")
print(f"Rate: {passed*100/total:.1f}%")
