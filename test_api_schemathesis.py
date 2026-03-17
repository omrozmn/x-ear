"""Schemathesis tests with pytest hooks for X-Ear API"""
import time
import random
import requests
import schemathesis

# Get impersonation token
def get_token():
    admin_resp = requests.post(
        "http://localhost:5003/api/admin/auth/login",
        json={"email": "admin@x-ear.com", "password": "admin123"},
        headers={"Idempotency-Key": f"admin-{int(time.time())}"}
    )
    admin_token = admin_resp.json()["data"]["token"]
    
    impersonate_resp = requests.post(
        "http://localhost:5003/api/admin/debug/switch-tenant",
        json={"targetTenantId": "938ab3ec-192a-4f89-8a63-6941212e2f2a"},
        headers={
            "Authorization": f"Bearer {admin_token}",
            "Idempotency-Key": f"tenant-{int(time.time())}"
        }
    )
    return impersonate_resp.json()["data"]["accessToken"]

TOKEN = get_token()
print(f"\n✓ Token: {TOKEN[:50]}...\n")

# Load schema using openapi.from_url
schema = schemathesis.openapi.from_url("http://localhost:5003/openapi.json")

# Register hook
@schema.hooks.register("before_call")
def add_headers(context, case):
    """Add Authorization and Idempotency-Key"""
    if case.headers is None:
        case.headers = {}
    
    # Authorization
    case.headers["Authorization"] = f"Bearer {TOKEN}"
    
    # Idempotency-Key for write operations
    if case.method in ["POST", "PUT", "PATCH", "DELETE"]:
        timestamp = int(time.time() * 1000)
        random_num = random.randint(1000, 9999)
        case.headers["Idempotency-Key"] = f"test-{timestamp}-{random_num}"

# Parametrize tests - only /api/parties endpoints
@schema.parametrize(endpoint="^/api/parties$")
def test_api(case):
    """Test API endpoints"""
    # Skip TRACE method
    if case.method == "TRACE":
        return
    
    case.call_and_validate()
