#!/usr/bin/env python3
"""Test admin POST/PUT/PATCH/DELETE endpoints."""
import requests
import json
import sys
import time
from typing import Dict, Any, Optional

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
        sys.exit(1)

def test_endpoint(method: str, endpoint: str, body: Optional[Dict] = None) -> tuple:
    """Test a single endpoint and return (success, status_code, message, data)."""
    url = f"{BASE_URL}{endpoint}"
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Idempotency-Key": f"test-{int(time.time() * 1000000)}"
    }
    
    try:
        if method == "POST":
            response = requests.post(url, json=body, headers=headers, timeout=10)
        elif method == "PUT":
            response = requests.put(url, json=body, headers=headers, timeout=10)
        elif method == "PATCH":
            response = requests.patch(url, json=body, headers=headers, timeout=10)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=10)
        else:
            return False, 0, f"Unknown method: {method}", None
        
        status = response.status_code
        
        try:
            data = response.json()
        except:
            data = None
        
        if status in [200, 201]:
            if data and data.get("success"):
                return True, status, "OK", data.get("data")
            elif data and not data.get("success"):
                error_msg = data.get("error", {}).get("message", "success=false")
                return False, status, error_msg, None
            else:
                return True, status, "OK (no JSON)", None
        elif status == 404:
            return False, status, "NOT FOUND", None
        elif status == 400:
            error_msg = data.get("error", {}).get("message", "Bad Request") if data else "Bad Request"
            return False, status, error_msg, None
        elif status == 401:
            return False, status, "UNAUTHORIZED", None
        elif status == 403:
            return False, status, "FORBIDDEN", None
        elif status == 422:
            return False, status, "VALIDATION ERROR", None
        elif status == 500:
            return False, status, "SERVER ERROR", None
        else:
            return False, status, f"HTTP {status}", None
            
    except Exception as e:
        return False, 0, f"ERROR: {str(e)[:50]}", None

# Test cases for mutation endpoints
MUTATION_TESTS = [
    # Users
    {
        "name": "Create User",
        "method": "POST",
        "endpoint": "/api/admin/users",
        "body": {
            "email": f"testuser{int(time.time())}@example.com",
            "password": "Test123!",
            "firstName": "Test",
            "lastName": "User"
        }
    },
    
    # Plans
    {
        "name": "Create Plan",
        "method": "POST",
        "endpoint": "/api/admin/plans",
        "body": {
            "name": f"Test Plan {int(time.time())}",
            "price": 99.99,
            "billingInterval": "monthly",
            "features": []
        }
    },
    
    # Addons
    {
        "name": "Create Addon",
        "method": "POST",
        "endpoint": "/api/admin/addons",
        "body": {
            "name": f"Test Addon {int(time.time())}",
            "price": 9.99,
            "description": "Test addon"
        }
    },
    
    # Campaigns
    {
        "name": "Create Campaign",
        "method": "POST",
        "endpoint": "/api/admin/campaigns",
        "body": {
            "name": f"Test Campaign {int(time.time())}",
            "type": "email",
            "status": "draft"
        }
    },
    
    # Suppliers
    {
        "name": "Create Supplier",
        "method": "POST",
        "endpoint": "/api/admin/suppliers",
        "body": {
            "companyName": f"Test Supplier {int(time.time())}",
            "contactEmail": f"supplier{int(time.time())}@example.com"
        }
    },
    
    # Tickets
    {
        "name": "Create Ticket",
        "method": "POST",
        "endpoint": "/api/admin/tickets",
        "body": {
            "title": f"Test Ticket {int(time.time())}",
            "description": "Test ticket description",
            "priority": "medium"
        }
    },
    
    # Notifications - Send
    {
        "name": "Send Notification",
        "method": "POST",
        "endpoint": "/api/admin/notifications/send",
        "body": {
            "targetType": "all",
            "title": "Test Notification",
            "message": "Test message"
        }
    },
    
    # Notification Templates
    {
        "name": "Create Notification Template",
        "method": "POST",
        "endpoint": "/api/admin/notifications/templates",
        "body": {
            "name": f"test-template-{int(time.time())}",
            "subject": "Test Subject",
            "body": "Test body"
        }
    },
    
    # API Keys
    {
        "name": "Create API Key",
        "method": "POST",
        "endpoint": "/api/admin/api-keys",
        "body": {
            "name": f"Test Key {int(time.time())}",
            "permissions": ["read"]
        }
    },
    
    # Marketplace Integrations
    {
        "name": "Create Marketplace Integration",
        "method": "POST",
        "endpoint": "/api/admin/marketplaces/integrations",
        "body": {
            "platform": "test",
            "credentials": {}
        }
    },
    
    # Invoices
    {
        "name": "Create Invoice",
        "method": "POST",
        "endpoint": "/api/admin/invoices",
        "body": {
            "subtotal": 100.0,
            "vatAmount": 18.0,
            "discountAmount": 0.0,
            "items": []
        }
    },
    
    # Init DB endpoints (should be idempotent)
    {
        "name": "Init Notifications DB",
        "method": "POST",
        "endpoint": "/api/admin/notifications/init-db",
        "body": {}
    },
    {
        "name": "Init Production DB",
        "method": "POST",
        "endpoint": "/api/admin/production/init-db",
        "body": {}
    },
    {
        "name": "Init Integrations DB",
        "method": "POST",
        "endpoint": "/api/admin/integrations/init-db",
        "body": {}
    },
    {
        "name": "Init Marketplaces DB",
        "method": "POST",
        "endpoint": "/api/admin/marketplaces/init-db",
        "body": {}
    },
]

def main():
    global TOKEN
    
    print("=" * 60)
    print("Testing Admin Mutation Endpoints")
    print("=" * 60)
    print()
    
    # Get authentication token
    print("🔐 Authenticating...")
    TOKEN = get_admin_token()
    print(f"✓ Authenticated successfully\n")
    
    # Test all mutation endpoints
    passed = 0
    failed = 0
    missing = 0
    errors = []
    
    print(f"Testing {len(MUTATION_TESTS)} mutation endpoints...\n")
    
    for test in MUTATION_TESTS:
        name = test["name"]
        method = test["method"]
        endpoint = test["endpoint"]
        body = test.get("body", {})
        
        success, status, message, data = test_endpoint(method, endpoint, body)
        
        if success:
            print(f"✓ {name}")
            passed += 1
        elif status == 404:
            print(f"✗ {name} [404 NOT FOUND]")
            missing += 1
            errors.append((name, endpoint, "404 NOT FOUND"))
        else:
            print(f"⚠ {name} [{message}]")
            failed += 1
            errors.append((name, endpoint, message))
    
    # Summary
    print()
    print("=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"✓ Passed:        {passed}")
    print(f"⚠ Failed:        {failed}")
    print(f"✗ Missing (404): {missing}")
    print(f"━ Total:         {len(MUTATION_TESTS)}")
    print()
    
    if errors:
        print("Failed Tests:")
        print("-" * 60)
        for name, endpoint, message in errors:
            print(f"  {name}")
            print(f"    {endpoint}")
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
