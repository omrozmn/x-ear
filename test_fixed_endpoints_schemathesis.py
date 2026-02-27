#!/usr/bin/env python3
"""Schemathesis test for FIXED endpoints only"""
import subprocess
import time
import requests
import sys

def get_impersonation_token():
    """Login as admin and impersonate tenant"""
    admin_response = requests.post(
        "http://localhost:5003/api/admin/auth/login",
        json={"email": "admin@x-ear.com", "password": "admin123"},
        headers={"Idempotency-Key": f"admin-login-{int(time.time())}"}
    )
    admin_token = admin_response.json()["data"]["token"]
    
    impersonate_response = requests.post(
        "http://localhost:5003/api/admin/debug/switch-tenant",
        json={"targetTenantId": "938ab3ec-192a-4f89-8a63-6941212e2f2a"},
        headers={
            "Authorization": f"Bearer {admin_token}",
            "Idempotency-Key": f"tenant-switch-{int(time.time())}"
        }
    )
    return impersonate_response.json()["data"]["accessToken"]

if __name__ == "__main__":
    print("Getting impersonation token...")
    token = get_impersonation_token()
    print(f"✓ Got token\n")
    
    # Test only the 11 fixed endpoints
    fixed_endpoints = [
        "^/api/activity-logs$",
        "^/api/audit$",
        "^/api/settings$",
        "^/api/devices$",
        "^/api/devices/low-stock$",
        "^/api/sms/headers$",
        "^/api/sms/admin/headers$",
        "^/api/invoices$",
        "^/api/admin/birfatura/invoices$",
        "^/api/admin/invoices$",
        "^/api/admin/inventory$",
    ]
    
    print("Running Schemathesis on 11 FIXED endpoints...")
    print("=" * 60)
    
    # Build regex pattern
    pattern = "|".join(fixed_endpoints)
    
    cmd = [
        "schemathesis", "run",
        "http://localhost:5003/openapi.json",
        "--url", "http://localhost:5003",
        "--header", f"Authorization: Bearer {token}",
        "--max-examples", "5",
        "--workers", "2",
        "--include-path-regex", pattern,
        "--exclude-checks", "unsupported_method"
    ]
    
    result = subprocess.run(cmd)
    sys.exit(result.returncode)
