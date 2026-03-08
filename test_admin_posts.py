#!/usr/bin/env python3
"""Test ALL admin POST endpoints with proper request bodies"""
import requests

# Login first
response = requests.post(
    "http://localhost:5003/api/auth/login",
    json={"email": "admin@x-ear.com", "password": "admin123"},
    headers={"Idempotency-Key": "test-login"}
)
token = response.json()["data"]["accessToken"]
headers = {"Authorization": f"Bearer {token}"}

# Get OpenAPI spec
openapi = requests.get("http://localhost:5003/openapi.json").json()

# Test data templates for common schemas
test_data = {
    # Empty body endpoints
    "/api/admin/settings/init-db": {},
    "/api/admin/settings/cache/clear": {},
    "/api/admin/settings/backup": {},
    "/api/admin/api-keys/init-db": {},
    "/api/admin/integrations/init-db": {},
    "/api/admin/notifications/init-db": {},
    "/api/admin/scan-queue/init-db": {},
    "/api/admin/marketplaces/init-db": {},
    "/api/admin/production/init-db": {},
    "/api/admin/debug/exit-impersonation": {},
    
    # Minimal required fields
    "/api/admin/users": {
        "email": "test@example.com",
        "firstName": "Test",
        "lastName": "User",
        "role": "user"
    },
    "/api/admin/tenants": {
        "name": "Test Tenant",
        "subdomain": "test-tenant-" + str(hash("test"))[:8]
    },
    "/api/admin/plans": {
        "name": "Test Plan",
        "price": 99.99,
        "billingCycle": "monthly"
    },
    "/api/admin/addons": {
        "name": "Test Addon",
        "price": 9.99
    },
    "/api/admin/roles": {
        "name": "Test Role",
        "description": "Test role description"
    },
    "/api/admin/api-keys": {
        "name": "Test API Key",
        "permissions": []
    },
    "/api/admin/suppliers": {
        "name": "Test Supplier",
        "contactEmail": "supplier@example.com"
    },
    "/api/admin/tickets": {
        "subject": "Test Ticket",
        "description": "Test description",
        "priority": "medium"
    },
    "/api/admin/invoices": {
        "customerId": "test-customer",
        "items": []
    },
    "/api/admin/notifications/send": {
        "title": "Test Notification",
        "message": "Test message",
        "recipientIds": []
    },
    "/api/admin/notifications/templates": {
        "name": "Test Template",
        "subject": "Test Subject",
        "body": "Test body"
    },
    "/api/admin/marketplaces/integrations": {
        "marketplace": "test",
        "apiKey": "test-key"
    },
    "/api/admin/sms/packages": {
        "name": "Test SMS Package",
        "smsCount": 1000,
        "price": 49.99,
        "isActive": True
    },
    "/api/admin/spam-preview": {
        "subject": "Test Email",
        "body": "Test email body",
        "recipient": "test@example.com"
    },
    "/api/admin/complaints/process-fbl": {
        "fblContent": "test fbl content",
        "provider": "test"
    },
    "/api/admin/settings": [
        {"key": "test_setting", "value": "test_value"}
    ],
    "/api/admin/impersonate": {
        "userId": "test-user-id"
    },
    "/api/admin/debug/switch-tenant": {
        "tenantId": "test-tenant-id"
    },
}

print("=== Testing Admin POST Endpoints ===\n")

passed = 0
failed = 0
results = []

for path, methods in openapi["paths"].items():
    if not path.startswith("/api/admin") or "post" not in methods:
        continue
    
    # Skip endpoints with path parameters
    if "{" in path:
        continue
    
    # Get test data for this endpoint
    body = test_data.get(path, {})
    
    try:
        resp = requests.post(
            f"http://localhost:5003{path}",
            headers=headers,
            json=body,
            timeout=5
        )
        
        if resp.status_code in [200, 201]:
            print(f"✓ POST {path}")
            passed += 1
            results.append((path, "PASS", resp.status_code))
        elif resp.status_code == 400:
            # Check if it's validation error or missing required fields
            try:
                error = resp.json()
                if "detail" in error and isinstance(error["detail"], list):
                    # Pydantic validation error - missing fields
                    missing = [e.get("loc", [])[-1] for e in error["detail"] if e.get("type") == "missing"]
                    print(f"⚠ POST {path} [400 - Missing: {', '.join(missing)}]")
                else:
                    print(f"⚠ POST {path} [400 - {error.get('detail', 'Bad Request')}]")
            except:
                print(f"⚠ POST {path} [400]")
            failed += 1
            results.append((path, "FAIL_400", resp.status_code))
        elif resp.status_code == 401:
            print(f"✗ POST {path} [401 UNAUTHORIZED]")
            failed += 1
            results.append((path, "FAIL_401", resp.status_code))
        elif resp.status_code == 403:
            print(f"✗ POST {path} [403 FORBIDDEN]")
            failed += 1
            results.append((path, "FAIL_403", resp.status_code))
        elif resp.status_code == 404:
            print(f"✗ POST {path} [404 NOT FOUND]")
            failed += 1
            results.append((path, "FAIL_404", resp.status_code))
        elif resp.status_code == 500:
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

print("\n=== Summary ===")
print(f"Total POST Endpoints: {passed + failed}")
print(f"Passed (200/201): {passed}")
print(f"Failed: {failed}")
print(f"Success Rate: {passed}/{passed + failed} ({100*passed//(passed + failed) if (passed + failed) > 0 else 0}%)")

# Show failed endpoints
failed_endpoints = [r for r in results if not r[1].startswith("PASS")]
if failed_endpoints:
    print(f"\n=== Failed Endpoints ({len(failed_endpoints)}) ===")
    for path, status, code in failed_endpoints[:15]:
        print(f"  {status}: {path}")
    if len(failed_endpoints) > 15:
        print(f"  ... and {len(failed_endpoints)-15} more")
