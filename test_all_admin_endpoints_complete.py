#!/usr/bin/env python3
"""Test ALL admin endpoints from OpenAPI spec"""
import requests
import json

# Login first
response = requests.post(
    "http://localhost:5003/api/auth/login",
    json={"email": "admin@x-ear.com", "password": "admin123"},
    headers={"Idempotency-Key": "test-login"}
)
token = response.json()["data"]["accessToken"]

headers = {"Authorization": f"Bearer {token}"}

# Get all admin endpoints from OpenAPI
openapi = requests.get("http://localhost:5003/openapi.json").json()

admin_endpoints = []
for path, methods in openapi["paths"].items():
    if path.startswith("/api/admin"):
        for method in methods.keys():
            if method.lower() in ["get", "post", "put", "patch", "delete"]:
                admin_endpoints.append((method.upper(), path))

print(f"=== Testing {len(admin_endpoints)} Admin Endpoints ===\n")

passed = 0
failed_401 = 0
failed_500 = 0
failed_404 = 0
failed_other = 0

results = []

for method, path in sorted(admin_endpoints):
    # Skip endpoints that need path parameters
    if "{" in path:
        continue
    
    try:
        if method == "GET":
            # Add pagination for list endpoints
            url = f"http://localhost:5003{path}"
            if "?" not in url:
                url += "?page=1&perPage=5"
            resp = requests.get(url, headers=headers, timeout=5)
        elif method == "POST":
            resp = requests.post(f"http://localhost:5003{path}", headers=headers, json={}, timeout=5)
        else:
            continue  # Skip PUT/PATCH/DELETE for now
        
        if resp.status_code == 200:
            print(f"✓ {method} {path}")
            passed += 1
            results.append((path, "PASS", resp.status_code))
        elif resp.status_code == 401:
            print(f"⚠ {method} {path} [401 UNAUTHORIZED]")
            failed_401 += 1
            results.append((path, "FAIL_401", resp.status_code))
        elif resp.status_code == 404:
            print(f"✗ {method} {path} [404 NOT FOUND]")
            failed_404 += 1
            results.append((path, "FAIL_404", resp.status_code))
        elif resp.status_code == 500:
            print(f"✗ {method} {path} [500 SERVER ERROR]")
            failed_500 += 1
            results.append((path, "FAIL_500", resp.status_code))
        else:
            print(f"⚠ {method} {path} [{resp.status_code}]")
            failed_other += 1
            results.append((path, f"FAIL_{resp.status_code}", resp.status_code))
    except Exception as e:
        print(f"✗ {method} {path} [ERROR: {str(e)[:50]}]")
        failed_other += 1
        results.append((path, "ERROR", 0))

print(f"\n=== Summary ===")
print(f"Total Endpoints: {len([r for r in results])}")
print(f"Passed (200): {passed}")
print(f"Failed (401): {failed_401}")
print(f"Failed (404): {failed_404}")
print(f"Failed (500): {failed_500}")
print(f"Failed (Other): {failed_other}")
print(f"Success Rate: {passed}/{len([r for r in results])} ({100*passed//max(1,len([r for r in results]))}%)")

# Group by status
print(f"\n=== Failed Endpoints by Type ===")
for status_type in ["FAIL_401", "FAIL_404", "FAIL_500"]:
    endpoints = [r[0] for r in results if r[1] == status_type]
    if endpoints:
        print(f"\n{status_type} ({len(endpoints)}):")
        for ep in endpoints[:10]:  # Show first 10
            print(f"  - {ep}")
        if len(endpoints) > 10:
            print(f"  ... and {len(endpoints)-10} more")
