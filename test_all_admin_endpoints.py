#!/usr/bin/env python3
"""Test all admin endpoints systematically."""
import requests
import sys
import time
from typing import Dict, Optional

BASE_URL = "http://localhost:5003"
TOKEN = None

def get_admin_token() -> str:
    """Get admin authentication token."""
    try:
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": "admin@x-ear.com", "password": "admin123"},
            headers={"Idempotency-Key": f"test-login-{int(time.time())}"},
            timeout=5
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("data", {}).get("accessToken") or data.get("data", {}).get("token")
        else:
            print(f"❌ Failed to login: {response.status_code}")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Cannot connect to backend at {BASE_URL}")
        print(f"   Error: {str(e)}")
        print("\n💡 Make sure the backend is running:")
        print("   cd x-ear/apps/api && python main.py")
        sys.exit(1)

def test_endpoint(method: str, endpoint: str, params: Optional[Dict] = None, 
                  body: Optional[Dict] = None, headers: Optional[Dict] = None) -> tuple:
    """Test a single endpoint and return (success, status_code, message)."""
    url = f"{BASE_URL}{endpoint}"
    req_headers = {"Authorization": f"Bearer {TOKEN}"}
    if headers:
        req_headers.update(headers)
    
    # Add Idempotency-Key for non-GET requests
    if method != "GET":
        req_headers["Idempotency-Key"] = f"test-{int(time.time() * 1000)}"
    
    try:
        if method == "GET":
            response = requests.get(url, params=params, headers=req_headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=body, params=params, headers=req_headers, timeout=10)
        elif method == "PUT":
            response = requests.put(url, json=body, params=params, headers=req_headers, timeout=10)
        elif method == "PATCH":
            response = requests.patch(url, json=body, params=params, headers=req_headers, timeout=10)
        elif method == "DELETE":
            response = requests.delete(url, params=params, headers=req_headers, timeout=10)
        else:
            return False, 0, f"Unknown method: {method}"
        
        status = response.status_code
        
        if status == 200:
            try:
                data = response.json()
                if data.get("success"):
                    return True, status, "OK"
                else:
                    error_msg = data.get("error", {}).get("message", "success=false")
                    return False, status, error_msg
            except:
                return True, status, "OK (non-JSON)"
        elif status == 404:
            return False, status, "NOT FOUND"
        elif status == 401:
            return False, status, "UNAUTHORIZED"
        elif status == 403:
            return False, status, "FORBIDDEN"
        elif status == 500:
            return False, status, "SERVER ERROR"
        else:
            return False, status, f"HTTP {status}"
            
    except requests.exceptions.Timeout:
        return False, 0, "TIMEOUT"
    except requests.exceptions.ConnectionError:
        return False, 0, "CONNECTION ERROR"
    except Exception as e:
        return False, 0, f"ERROR: {str(e)[:50]}"

# Comprehensive list of all admin endpoints
ENDPOINTS = [
    # Auth
    ("GET", "/api/admin/auth/me", {}),
    
    # Users
    ("GET", "/api/admin/users", {"page": 1, "perPage": 10}),
    ("GET", "/api/admin/admin-users", {"page": 1, "perPage": 10}),
    ("GET", "/api/admin/my-permissions", {}),
    
    # Tenants
    ("GET", "/api/admin/tenants", {"page": 1, "perPage": 10}),
    ("GET", "/api/admin/tenants/stats", {}),
    
    # Dashboard & Analytics
    ("GET", "/api/admin/dashboard", {}),
    ("GET", "/api/admin/dashboard/stats", {}),
    ("GET", "/api/admin/analytics", {}),
    ("GET", "/api/admin/analytics/overview", {}),
    ("GET", "/api/admin/analytics/revenue", {}),
    ("GET", "/api/admin/analytics/users", {}),
    ("GET", "/api/admin/analytics/tenants", {}),
    
    # Plans & Addons
    ("GET", "/api/admin/plans", {"page": 1, "perPage": 10}),
    ("GET", "/api/admin/addons", {"page": 1, "perPage": 10}),
    
    # Campaigns
    ("GET", "/api/admin/campaigns", {"page": 1, "perPage": 10}),
    
    # Email Management
    ("GET", "/api/admin/bounces", {"page": 1, "perPage": 10}),
    ("GET", "/api/admin/bounces/stats", {}),
    ("GET", "/api/admin/unsubscribes", {"page": 1, "perPage": 10}),
    ("GET", "/api/admin/unsubscribes/stats", {}),
    ("GET", "/api/admin/email-approvals", {"page": 1, "perPage": 10}),
    ("GET", "/api/admin/email-approvals/stats", {}),
    ("GET", "/api/admin/complaints", {"page": 1, "perPage": 10}),
    ("GET", "/api/admin/complaints/stats", {}),
    
    # Notifications
    ("GET", "/api/admin/notifications", {"page": 1, "perPage": 10}),
    ("GET", "/api/admin/notifications/templates", {"page": 1, "perPage": 10}),
    
    # Settings & Permissions
    ("GET", "/api/admin/settings", {}),
    ("GET", "/api/admin/roles", {"page": 1, "perPage": 10}),
    ("GET", "/api/admin/permissions", {}),
    
    # API Keys
    ("GET", "/api/admin/api-keys", {"page": 1, "perPage": 10}),
    
    # Appointments
    ("GET", "/api/admin/appointments", {"page": 1, "perPage": 10}),
    
    # BirFatura
    ("GET", "/api/admin/birfatura/stats", {}),
    ("GET", "/api/admin/birfatura/invoices", {"page": 1, "perPage": 10}),
    ("GET", "/api/admin/birfatura/logs", {"page": 1, "perPage": 10}),
    
    # Integrations
    ("GET", "/api/admin/integrations", {}),
    ("GET", "/api/admin/integrations/vatan-sms/config", {}),
    ("GET", "/api/admin/integrations/birfatura/config", {}),
    ("GET", "/api/admin/integrations/telegram/config", {}),
    
    # Inventory
    ("GET", "/api/admin/inventory", {"page": 1, "perPage": 10}),
    
    # Invoices
    ("GET", "/api/admin/invoices", {"page": 1, "perPage": 10}),
    
    # Marketplaces
    ("GET", "/api/admin/marketplaces/integrations", {}),
    
    # Parties
    ("GET", "/api/admin/parties", {"page": 1, "perPage": 10}),
    
    # Payments
    ("GET", "/api/admin/payments/pos/transactions", {}),
    
    # Production
    ("GET", "/api/admin/production/orders", {}),
    
    # Scan Queue
    ("GET", "/api/admin/scan-queue", {"page": 1, "perPage": 10}),
    
    # Suppliers
    ("GET", "/api/admin/suppliers", {"page": 1, "perPage": 10}),
    
    # Tickets
    ("GET", "/api/admin/tickets", {"page": 1, "perPage": 10}),
    
    # Example Documents
    ("GET", "/api/admin/example-documents", {}),
]

def main():
    global TOKEN
    
    print("=" * 60)
    print("Testing All Admin Endpoints")
    print("=" * 60)
    print()
    
    # Get authentication token
    print("🔐 Authenticating...")
    TOKEN = get_admin_token()
    print("✓ Authenticated successfully\n")
    
    # Test all endpoints
    passed = 0
    failed = 0
    missing = 0
    errors = []
    
    print(f"Testing {len(ENDPOINTS)} endpoints...\n")
    
    for method, endpoint, params in ENDPOINTS:
        success, status, message = test_endpoint(method, endpoint, params)
        
        if success:
            print(f"✓ {method:6} {endpoint}")
            passed += 1
        elif status == 404:
            print(f"✗ {method:6} {endpoint} [404 NOT FOUND]")
            missing += 1
            errors.append((endpoint, "404 NOT FOUND"))
        else:
            print(f"⚠ {method:6} {endpoint} [{message}]")
            failed += 1
            errors.append((endpoint, message))
    
    # Summary
    print()
    print("=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"✓ Passed:        {passed}")
    print(f"⚠ Failed:        {failed}")
    print(f"✗ Missing (404): {missing}")
    print(f"━ Total:         {len(ENDPOINTS)}")
    print()
    
    if errors:
        print("Failed Endpoints:")
        print("-" * 60)
        for endpoint, message in errors:
            print(f"  {endpoint}")
            print(f"    → {message}")
        print()
    
    # Exit code
    if missing > 0 or failed > 0:
        print("❌ Some tests failed")
        sys.exit(1)
    else:
        print("✅ All tests passed!")
        sys.exit(0)

if __name__ == "__main__":
    main()
