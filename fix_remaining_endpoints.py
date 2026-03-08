#!/usr/bin/env python3
"""Fix remaining admin POST endpoints by checking required fields"""
import requests

TOKEN = requests.post(
    "http://localhost:5003/api/auth/login",
    json={"email": "admin@x-ear.com", "password": "admin123"},
    headers={"Idempotency-Key": "test-login"}
).json()["data"]["accessToken"]

headers = {"Authorization": f"Bearer {TOKEN}"}

# Get first tenant ID
tenants = requests.get("http://localhost:5003/api/admin/tenants?page=1&perPage=1", headers=headers).json()
tenant_id = tenants["data"]["tenants"][0]["id"] if tenants.get("success") and tenants["data"]["tenants"] else None

print(f"Using tenant_id: {tenant_id}\n")

# Test each failing endpoint with proper data
tests = [
    {
        "name": "POST /api/admin/users",
        "path": "/api/admin/users",
        "body": {
            "email": f"test{hash('user')}@example.com",
            "password": "Test123!",
            "firstName": "Test",
            "lastName": "User",
            "tenantId": tenant_id
        }
    },
    {
        "name": "POST /api/admin/suppliers",
        "path": "/api/admin/suppliers",
        "body": {
            "companyName": f"Supplier {hash('sup')}",
            "tenantId": tenant_id
        }
    },
    {
        "name": "POST /api/admin/api-keys",
        "path": "/api/admin/api-keys",
        "body": {
            "tenantId": tenant_id,
            "name": "Test API Key"
        }
    },
    {
        "name": "POST /api/admin/notifications/templates",
        "path": "/api/admin/notifications/templates",
        "body": {
            "name": f"template-{hash('tpl')}",
            "subject": "Test Subject",
            "body": "Test body",
            "tenantId": tenant_id
        }
    },
    {
        "name": "POST /api/admin/invoices",
        "path": "/api/admin/invoices",
        "body": {
            "tenantId": tenant_id,
            "subtotal": 100,
            "vatAmount": 18,
            "discountAmount": 0
        }
    },
    {
        "name": "POST /api/admin/impersonate",
        "path": "/api/admin/impersonate",
        "body": {
            "tenant_id": tenant_id
        }
    },
    {
        "name": "POST /api/admin/debug/switch-tenant",
        "path": "/api/admin/debug/switch-tenant",
        "body": {
            "targetTenantId": tenant_id
        }
    }
]

for test in tests:
    h = headers.copy()
    h["Idempotency-Key"] = f"test-{hash(test['name'])}"
    h["Content-Type"] = "application/json"
    
    resp = requests.post(
        f"http://localhost:5003{test['path']}",
        headers=h,
        json=test["body"],
        timeout=5
    )
    
    success = resp.status_code in [200, 201]
    status = "✓ PASS" if success else f"✗ FAIL ({resp.status_code})"
    
    if not success:
        try:
            error = resp.json()
            msg = error.get("error", {}).get("message", "")
            if msg:
                status += f": {msg[:60]}"
        except:
            pass
    
    print(f"{status} - {test['name']}")

print("\n=== Summary ===")
print("Check which endpoints still fail and need schema/router fixes")
