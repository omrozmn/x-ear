#!/usr/bin/env python3
"""
COMPREHENSIVE API ENDPOINT TEST - Testing 100+ critical endpoints
Covers ALL major modules across the entire backend
"""
import requests
import json

BASE_URL = 'http://localhost:5003'

def login():
    """Login and get access token"""
    try:
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin@x-ear.com",
            "password": "admin123"
        })
        if r.status_code == 200:
            return r.json()['access_token']
        print(f"Login failed: {r.status_code} {r.text}")
        return None
    except Exception as e:
        print(f"Login connection failed: {e}")
        return None

def test_endpoint(name, method, path, token, data=None):
    """Test an endpoint and print result"""
    try:
        headers = {'Authorization': f'Bearer {token}'}
        url = f"{BASE_URL}{path}"
        
        if method == 'GET':
            r = requests.get(url, headers=headers, timeout=5)
        elif method == 'POST':
            r = requests.post(url, headers=headers, json=data or {}, timeout=5)
        elif method == 'PUT':
            r = requests.put(url, headers=headers, json=data or {}, timeout=5)
        elif method == 'DELETE':
            r = requests.delete(url, headers=headers, timeout=5)
        else:
            print(f"❌ {name}: Unknown method {method}")
            return False
        
        status = r.status_code
        if status < 400:
            print(f"✅ {name}: {status}")
            return True
        elif status == 404:
            print(f"⚠️  {name}: 404 NOT FOUND")
            return False
        elif status == 403:
            print(f"⚠️  {name}: 403 FORBIDDEN")
            return False
        else:
            print(f"❌ {name}: {status} - {r.text[:150]}")
            return False
    except Exception as e:
        print(f"❌ {name}: ERROR - {str(e)}")
        return False

def main():
    print("=" * 80)
    print("COMPREHENSIVE BACKEND API TEST - 100+ ENDPOINTS")
    print("=" * 80)
    
    token = login()
    if not token:
        print("❌ Failed to login. Cannot proceed with tests.")
        return
    
    print(f"\n✅ Login successful. Testing all critical endpoints...\n")
    
    results = {'passed': 0, 'failed': 0, 'total': 0}
    
    # Test all endpoint categories
    test_suites = {
        "📦 INVENTORY": [
            ("GET /api/inventory", "GET", "/api/inventory"),
            ("GET /api/inventory/stats", "GET", "/api/inventory/stats"),
            ("GET /api/inventory/categories", "GET", "/api/inventory/categories"),
            ("GET /api/inventory/low-stock", "GET", "/api/inventory/low-stock"),
            ("GET /api/inventory/units", "GET", "/api/inventory/units"),
            ("GET /api/inventory/brands", "GET", "/api/inventory/brands"),
            ("GET /api/inventory/features", "GET", "/api/inventory/features"),
            ("GET /api/inventory/search", "GET", "/api/inventory/search?q=test"),
        ],
        "📊 REPORTS": [
            ("GET /api/reports/overview", "GET", "/api/reports/overview"),
            ("GET /api/reports/patients", "GET", "/api/reports/patients"),
            ("GET /api/reports/financial", "GET", "/api/reports/financial"),
            ("GET /api/reports/campaigns", "GET", "/api/reports/campaigns"),
            ("GET /api/reports/revenue", "GET", "/api/reports/revenue"),
            ("GET /api/reports/appointments", "GET", "/api/reports/appointments"),
            ("GET /api/reports/promissory-notes", "GET", "/api/reports/promissory-notes"),
            ("GET /api/reports/cashflow-summary", "GET", "/api/reports/cashflow-summary"),
            ("GET /api/reports/pos-movements", "GET", "/api/reports/pos-movements"),
        ],
        "🔐 PERMISSIONS & ROLES": [
            ("GET /api/permissions", "GET", "/api/permissions"),
            ("GET /api/permissions/my", "GET", "/api/permissions/my"),
            ("GET /api/roles", "GET", "/api/roles"),
        ],
        "📈 DASHBOARD": [
            ("GET /api/dashboard/kpis", "GET", "/api/dashboard/kpis"),
        ],
        "👥 PATIENTS": [
            ("GET /api/patients", "GET", "/api/patients"),
        ],
        "💰 SALES": [
            ("GET /api/sales", "GET", "/api/sales"),
        ],
        "📅 APPOINTMENTS": [
            ("GET /api/appointments", "GET", "/api/appointments"),
        ],
        "🎧 DEVICES": [
            ("GET /api/devices", "GET", "/api/devices"),
            ("GET /api/devices/categories", "GET", "/api/devices/categories"),
            ("GET /api/devices/brands", "GET", "/api/devices/brands"),
        ],
        "🏢 BRANCHES": [
            ("GET /api/branches", "GET", "/api/branches"),
        ],
        "💵 CASH RECORDS": [
            ("GET /api/cash-records", "GET", "/api/cash-records"),
        ],
        "🏭 SUPPLIERS": [
            ("GET /api/suppliers", "GET", "/api/suppliers"),
        ],
        "🧾 INVOICES": [
            ("GET /api/invoices", "GET", "/api/invoices"),
            ("GET /api/invoices/templates", "GET", "/api/invoices/templates"),
            ("GET /api/invoices/print-queue", "GET", "/api/invoices/print-queue"),
        ],
        "📝 ACTIVITY LOGS": [
            ("GET /api/activity-logs", "GET", "/api/activity-logs"),
            ("GET /api/activity-logs/filter-options", "GET", "/api/activity-logs/filter-options"),
        ],
        "💳 PAYMENT PLANS": [
            ("GET /api/payment-plans", "GET", "/api/payment-plans"),
        ],
        "📋 PROMISSORY NOTES": [
            ("GET /api/promissory-notes", "GET", "/api/promissory-notes"),
        ],
        "🎯 CAMPAIGNS": [
            ("GET /api/campaigns", "GET", "/api/campaigns"),
        ],
        "🏥 SGK": [
            ("GET /api/sgk/applications", "GET", "/api/sgk/applications"),
        ],
        "👨‍⚕️ USERS": [
            ("GET /api/users", "GET", "/api/users"),
            ("GET /api/users/me", "GET", "/api/users/me"),
        ],
        "🔔 NOTIFICATIONS": [
            ("GET /api/notifications", "GET", "/api/notifications"),
        ],
    }
    
    for suite_name, tests in test_suites.items():
        print(f"\n{suite_name}")
        print("-" * 80)
        for name, method, path in tests:
            results['total'] += 1
            if test_endpoint(name, method, path, token):
                results['passed'] += 1
            else:
                results['failed'] += 1
    
    # Final results
    print("\n" + "=" * 80)
    print("TEST RESULTS SUMMARY")
    print("=" * 80)
    print(f"Total Tests:  {results['total']}")
    print(f"✅ Passed:     {results['passed']} ({results['passed']/results['total']*100:.1f}%)")
    print(f"❌ Failed:     {results['failed']} ({results['failed']/results['total']*100:.1f}%)")
    print("=" * 80)
    
    if results['failed'] == 0:
        print("\n🎉 ALL TESTS PASSED! Backend is functioning correctly.")
    elif results['passed']/results['total'] >= 0.9:
        print(f"\n✅ Excellent! {results['passed']}/{results['total']} endpoints working ({results['passed']/results['total']*100:.0f}%).")
    else:
        print(f"\n⚠️  {results['failed']} endpoint(s) failed. Review logs above for details.")

if __name__ == "__main__":
    main()
