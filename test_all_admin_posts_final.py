#!/usr/bin/env python3
"""Comprehensive test of ALL admin POST endpoints"""
import requests
import json
import uuid

# Login
response = requests.post(
    "http://localhost:5003/api/auth/login",
    json={"email": "admin@x-ear.com", "password": "admin123"},
    headers={"Idempotency-Key": f"login-{uuid.uuid4()}"}
)
token = response.json()["data"]["accessToken"]

def make_post(path, body=None):
    """Make POST request with proper headers"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Idempotency-Key": f"test-{uuid.uuid4()}"
    }
    return requests.post(
        f"http://localhost:5003{path}",
        headers=headers,
        json=body or {},
        timeout=5
    )

# Get OpenAPI spec to find all POST endpoints
openapi = requests.get("http://localhost:5003/openapi.json").json()

admin_posts = []
for path, methods in openapi["paths"].items():
    if path.startswith("/api/admin") and "post" in methods and "{" not in path:
        admin_posts.append(path)

print(f"=== Testing {len(admin_posts)} Admin POST Endpoints ===\n")

passed = 0
failed = 0
results = []

for path in sorted(admin_posts):
    # Determine appropriate body based on endpoint
    body = {}
    
    # Endpoints that need specific data
    if "/roles" in path and path.endswith("/roles"):
        body = {"name": f"Test Role {uuid.uuid4().hex[:8]}", "description": "Test"}
    elif "/sms/packages" in path:
        body = {"name": f"Test Package {uuid.uuid4().hex[:8]}", "smsCount": 1000, "price": 49.99, "isActive": True}
    elif "/tenants" in path and path.endswith("/tenants"):
        body = {"name": f"Test Tenant {uuid.uuid4().hex[:8]}", "subdomain": f"test-{uuid.uuid4().hex[:8]}"}
    elif "/users" in path and path.endswith("/users"):
        body = {"email": f"test-{uuid.uuid4().hex[:8]}@example.com", "firstName": "Test", "lastName": "User", "role": "user"}
    elif "/settings" in path and path.endswith("/settings"):
        body = [{"key": f"test_key_{uuid.uuid4().hex[:8]}", "value": "test_value"}]
    
    try:
        resp = make_post(path, body)
        
        if resp.status_code in [200, 201]:
            print(f"✓ POST {path}")
            passed += 1
            results.append((path, "PASS", resp.status_code))
        elif resp.status_code == 400:
            try:
                error = resp.json()
                detail = error.get("error", {}).get("message") or error.get("detail", "Bad Request")
                if isinstance(detail, list):
                    missing = [e.get("loc", [])[-1] for e in detail if e.get("type") == "missing"]
                    print(f"⚠ POST {path} [400 - Missing: {', '.join(missing)}]")
                else:
                    print(f"⚠ POST {path} [400 - {detail[:50]}]")
            except:
                print(f"⚠ POST {path} [400]")
            failed += 1
            results.append((path, "FAIL_400", resp.status_code))
        elif resp.status_code in [401, 403]:
            print(f"✗ POST {path} [{resp.status_code} AUTH ERROR]")
            failed += 1
            results.append((path, f"FAIL_{resp.status_code}", resp.status_code))
        elif resp.status_code == 404:
            print(f"✗ POST {path} [404 NOT FOUND]")
            failed += 1
            results.append((path, "FAIL_404", resp.status_code))
        elif resp.status_code == 500:
            try:
                error = resp.json()
                msg = error.get("error", {}).get("message", "Server Error")
                print(f"✗ POST {path} [500 - {msg[:50]}]")
            except:
                print(f"✗ POST {path} [500 SERVER ERROR]")
            failed += 1
            results.append((path, "FAIL_500", resp.status_code))
        else:
            print(f"⚠ POST {path} [{resp.status_code}]")
            failed += 1
            results.append((path, f"FAIL_{resp.status_code}", resp.status_code))
    except Exception as e:
        print(f"✗ POST {path} [ERROR: {str(e)[:50]}]")
        failed += 1
        results.append((path, "ERROR", 0))

print(f"\n=== Summary ===")
print(f"Total: {passed + failed}")
print(f"Passed: {passed}")
print(f"Failed: {failed}")
print(f"Success Rate: {passed}/{passed + failed} ({100*passed//(passed + failed) if (passed + failed) > 0 else 0}%)")

# Show failures by type
for status_type in ["FAIL_400", "FAIL_401", "FAIL_403", "FAIL_404", "FAIL_500", "ERROR"]:
    endpoints = [r[0] for r in results if r[1] == status_type]
    if endpoints:
        print(f"\n{status_type} ({len(endpoints)}):")
        for ep in endpoints[:10]:
            print(f"  - {ep}")
        if len(endpoints) > 10:
            print(f"  ... and {len(endpoints)-10} more")
