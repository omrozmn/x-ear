#!/usr/bin/env python3
"""Test ALL admin endpoints (GET + POST)"""
import requests
import uuid

# Login
response = requests.post(
    "http://localhost:5003/api/auth/login",
    json={"email": "admin@x-ear.com", "password": "admin123"},
    headers={"Idempotency-Key": f"login-{uuid.uuid4()}"}
)
token = response.json()["data"]["accessToken"]
headers = {"Authorization": f"Bearer {token}"}

def make_request(method, path, body=None):
    """Make request with proper headers"""
    h = headers.copy()
    if method == "POST":
        h["Idempotency-Key"] = f"test-{uuid.uuid4()}"
    
    if method == "GET":
        url = f"http://localhost:5003{path}"
        if "?" not in url:
            url += "?page=1&perPage=5"
        return requests.get(url, headers=h, timeout=5)
    elif method == "POST":
        return requests.post(f"http://localhost:5003{path}", headers=h, json=body or {}, timeout=5)

# Get OpenAPI spec
openapi = requests.get("http://localhost:5003/openapi.json").json()

admin_endpoints = []
for path, methods in openapi["paths"].items():
    if path.startswith("/api/admin") and "{" not in path:
        for method in methods.keys():
            if method.upper() in ["GET", "POST"]:
                admin_endpoints.append((method.upper(), path))

print(f"=== Testing {len(admin_endpoints)} Admin Endpoints ===\n")

get_passed = get_failed = post_passed = post_failed = 0

for method, path in sorted(admin_endpoints):
    # Determine body for POST
    body = {}
    if method == "POST":
        if "/roles" in path and path.endswith("/roles"):
            body = {"name": f"Test {uuid.uuid4().hex[:8]}", "description": "Test"}
        elif "/sms/packages" in path:
            body = {"name": f"Test {uuid.uuid4().hex[:8]}", "smsCount": 1000, "price": 49.99, "isActive": True}
        elif "/tenants" in path and path.endswith("/tenants"):
            body = {"name": f"Test {uuid.uuid4().hex[:8]}", "subdomain": f"test-{uuid.uuid4().hex[:8]}"}
        elif "/settings" in path and path.endswith("/settings"):
            body = [{"key": f"test_{uuid.uuid4().hex[:8]}", "value": "test"}]
    
    try:
        resp = make_request(method, path, body)
        
        if resp.status_code in [200, 201]:
            print(f"✓ {method:4} {path}")
            if method == "GET":
                get_passed += 1
            else:
                post_passed += 1
        else:
            status_msg = f"[{resp.status_code}]"
            if resp.status_code == 400:
                try:
                    error = resp.json()
                    msg = error.get("error", {}).get("message") or error.get("detail", "")
                    if msg:
                        status_msg = f"[400 - {str(msg)[:30]}]"
                except:
                    pass
            print(f"⚠ {method:4} {path} {status_msg}")
            if method == "GET":
                get_failed += 1
            else:
                post_failed += 1
    except Exception:
        print(f"✗ {method:4} {path} [ERROR]")
        if method == "GET":
            get_failed += 1
        else:
            post_failed += 1

print("\n=== Summary ===")
print(f"GET Endpoints:  {get_passed}/{get_passed + get_failed} passed ({100*get_passed//(get_passed + get_failed) if (get_passed + get_failed) > 0 else 0}%)")
print(f"POST Endpoints: {post_passed}/{post_passed + post_failed} passed ({100*post_passed//(post_passed + post_failed) if (post_passed + post_failed) > 0 else 0}%)")
print(f"TOTAL:          {get_passed + post_passed}/{len(admin_endpoints)} passed ({100*(get_passed + post_passed)//len(admin_endpoints)}%)")
