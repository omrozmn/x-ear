#!/usr/bin/env python3
"""Schemathesis test runner with custom hooks for X-Ear API"""
import subprocess
import time
import requests
import sys

def get_impersonation_token():
    """Login as admin and impersonate tenant"""
    # Admin login
    admin_response = requests.post(
        "http://localhost:5003/api/admin/auth/login",
        json={"email": "admin@x-ear.com", "password": "admin123"},
        headers={"Idempotency-Key": f"admin-login-{int(time.time())}"}
    )
    admin_token = admin_response.json()["data"]["token"]
    
    # Tenant impersonation
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
    # Get token
    print("Getting impersonation token...")
    token = get_impersonation_token()
    print(f"✓ Got token: {token[:50]}...\n")
    
    # Run schemathesis with proper headers
    print("Running Schemathesis tests on ALL endpoints...")
    print("=" * 60)
    
    cmd = [
        "schemathesis", "run",
        "http://localhost:5003/openapi.json",
        "--url", "http://localhost:5003",
        "--header", f"Authorization: Bearer {token}",
        "--max-examples", "2",
        "--workers", "4",
        "--exclude-checks", "unsupported_method"
    ]
    
    result = subprocess.run(cmd, capture_output=False)
    sys.exit(result.returncode)
