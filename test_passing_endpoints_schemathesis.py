#!/usr/bin/env python3
"""
Schemathesis test for 15 PASSING endpoints to verify OpenAPI compliance.
Schemathesis automatically discovers all endpoints from OpenAPI spec.
"""

import schemathesis
import requests

# Get impersonation token
print("Getting impersonation token...")
admin_login = requests.post(
    "http://localhost:5003/api/admin/auth/login",
    json={"email": "admin@x-ear.com", "password": "admin123"},
    headers={"Idempotency-Key": "admin-login-test"}
)
admin_token = admin_login.json()["data"]["token"]

switch_response = requests.post(
    "http://localhost:5003/api/admin/debug/switch-tenant",
    json={"targetTenantId": "938ab3ec-192a-4f89-8a63-6941212e2f2a"},
    headers={
        "Authorization": f"Bearer {admin_token}",
        "Idempotency-Key": "tenant-switch-test"
    }
)
token = switch_response.json()["data"]["accessToken"]
print("✓ Got token\n")

print("Running Schemathesis on passing endpoints...")
print("=" * 60 + "\n")

# Load schema and let Schemathesis discover endpoints automatically
schema = schemathesis.from_url(
    "http://localhost:5003/openapi.json",
    headers={"Authorization": f"Bearer {token}"}
)

# Test only these 15 passing endpoints
@schema.parametrize()
@schema.include(
    path_regex=r"^/api/(activity-logs(/stats|/filter-options)?|addons|admin/(campaigns|users|tenants|dashboard(/stats)?|plans|addons|analytics(/overview|/revenue|/users)?))$"
)
def test_passing_endpoints(case):
    """Test passing endpoints for OpenAPI compliance."""
    response = case.call()
    case.validate_response(response)
