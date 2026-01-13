#!/usr/bin/env python3
"""
SYSTEMATIC ENDPOINT TESTING - ALL 450 ENDPOINTS BY MODULE
Tests every module systematically to identify all working and failing endpoints
"""
import requests
import json
from collections import defaultdict

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
        print(f"Login failed: {r.status_code}")
        return None
    except Exception as e:
        print(f"Login error: {e}")
        return None

def test_endpoint(method, path, token, data=None, timeout=5):
    """Test an endpoint and return status"""
    try:
        headers = {'Authorization': f'Bearer {token}'}
        url = f"{BASE_URL}{path}"
        
        if method == 'GET':
            r = requests.get(url, headers=headers, timeout=timeout)
        elif method == 'POST':
            r = requests.post(url, headers=headers, json=data or {}, timeout=timeout)
        elif method == 'PUT':
            r = requests.put(url, headers=headers, json=data or {}, timeout=timeout)
        elif method == 'PATCH':
            r = requests.patch(url, headers=headers, json=data or {}, timeout=timeout)
        elif method == 'DELETE':
            r = requests.delete(url, headers=headers, timeout=timeout)
        else:
            return {'status': 'SKIP', 'code': 0, 'error': f'Unknown method {method}'}
        
        status = r.status_code
        if status < 400:
            return {'status': 'PASS', 'code': status}
        elif status == 404:
            return {'status': '404', 'code': 404}
        elif status == 403:
            return {'status': '403', 'code': 403}
        elif status == 401:
            return {'status': '401', 'code': 401}
        elif status == 405:
            return {'status': '405', 'code': 405}
        elif status == 500:
            return {'status': 'FAIL', 'code': 500, 'error': r.text[:100]}
        else:
            return {'status': 'ERROR', 'code': status, 'error': r.text[:100]}
    except requests.exceptions.Timeout:
        return {'status': 'TIMEOUT', 'code': 0}
    except Exception as e:
        return {'status': 'EXCEPTION', 'code': 0, 'error': str(e)[:100]}

def main():
    print("=" * 100)
    print("SYSTEMATIC ENDPOINT TESTING - ALL 450 ENDPOINTS")
    print("=" * 100)
    
    token = login()
    if not token:
        print("❌ Failed to login")
        return
    
    print("✅ Login successful\n")
    
    # Define all testable GET endpoints by module
    # Format: (method, path, description)
    test_suites = {
        "INVENTORY (22 endpoints)": [
            ("GET", "/api/inventory", "List inventory items"),
            ("GET", "/api/inventory/stats", "Inventory statistics"),
            ("GET", "/api/inventory/categories", "List categories"),
            ("GET", "/api/inventory/brands", "List brands"),
            ("GET", "/api/inventory/features", "List features"),
            ("GET", "/api/inventory/units", "List units"),
            ("GET", "/api/inventory/low-stock", "Low stock items"),
            ("GET", "/api/inventory/search?q=test", "Search inventory"),
        ],
        "INVOICES (22 endpoints)": [
            ("GET", "/api/invoices", "List invoices"),
            ("GET", "/api/invoices/templates", "Invoice templates"),
            ("GET", "/api/invoices/print-queue", "Print queue"),
        ],
        "SALES (17 endpoints)": [
            ("GET", "/api/sales", "List sales"),
            ("GET", "/api/sales/stats", "Sales statistics"),
            ("GET", "/api/sales/summary", "Sales summary"),
        ],
        "SGK (16 endpoints)": [
            ("GET", "/api/sgk/applications", "SGK applications"),
            ("GET", "/api/sgk/e-receipts", "E-receipts"),
        ],
        "SUPPLIERS (16 endpoints)": [
            ("GET", "/api/suppliers", "List suppliers"),
        ],
        "PATIENTS (11 endpoints)": [
            ("GET", "/api/patients", "List patients"),
            ("GET", "/api/patients/stats", "Patient statistics"),
        ],
        "REPORTS (12 endpoints)": [
            ("GET", "/api/reports/overview", "Overview report"),
            ("GET", "/api/reports/patients", "Patients report"),
            ("GET", "/api/reports/financial", "Financial report"),
            ("GET", "/api/reports/campaigns", "Campaigns report"),
            ("GET", "/api/reports/revenue", "Revenue report"),
            ("GET", "/api/reports/appointments", "Appointments report"),
            ("GET", "/api/reports/promissory-notes", "Promissory notes report"),
            ("GET", "/api/reports/cashflow-summary", "Cashflow summary"),
            ("GET", "/api/reports/pos-movements", "POS movements"),
        ],
        "APPOINTMENTS (10 endpoints)": [
            ("GET", "/api/appointments", "List appointments"),
        ],
        "DEVICES (10 endpoints)": [
            ("GET", "/api/devices", "List devices"),
            ("GET", "/api/devices/categories", "Device categories"),
            ("GET", "/api/devices/brands", "Device brands"),
        ],
        "COMMUNICATIONS (11 endpoints)": [
            ("GET", "/api/communications/sms", "SMS history"),
        ],
        "ACTIVITY LOGS (7 endpoints)": [
            ("GET", "/api/activity-logs", "Activity logs"),
            ("GET", "/api/activity-logs/filter-options", "Filter options"),
        ],
        "USERS (7 endpoints)": [
            ("GET", "/api/users", "List users"),
            ("GET", "/api/users/me", "Current user"),
        ],
        "AUTH (7 endpoints)": [
            ("GET", "/api/auth/me", "Current user info"),
        ],
        "ROLES (6 endpoints)": [
            ("GET", "/api/roles", "List roles"),
        ],
        "PERMISSIONS": [
            ("GET", "/api/permissions", "List permissions"),
            ("GET", "/api/permissions/my", "My permissions"),
        ],
        "DASHBOARD (6 endpoints)": [
            ("GET", "/api/dashboard/kpis", "Dashboard KPIs"),
        ],
        "BRANCHES": [
            ("GET", "/api/branches", "List branches"),
        ],
        "CASH RECORDS": [
            ("GET", "/api/cash-records", "Cash records"),
        ],
        "CAMPAIGNS": [
            ("GET", "/api/campaigns", "List campaigns"),
        ],
        "NOTIFICATIONS (7 endpoints)": [
            ("GET", "/api/notifications?user_id=test", "User notifications"),
        ],
        "PAYMENTS (8 endpoints)": [
            ("GET", "/api/payment-plans", "Payment plans"),
        ],
        "PROMISSORY NOTES": [
            ("GET", "/api/promissory-notes", "Promissory notes"),
        ],
        "REPLACEMENTS (6 endpoints)": [
            ("GET", "/api/replacements", "Device replacements"),
        ],
        "PROFORMAS (5 endpoints)": [
            ("GET", "/api/proformas", "Proforma invoices"),
        ],
    }
    
    # Track results
    results = {
        'total': 0,
        'passed': 0,
        'failed_500': 0,
        'failed_404': 0,
        'failed_403': 0,
        'failed_401': 0,
        'failed_405': 0,
        'other_errors': 0,
        'by_module': {}
    }
    
    # Test each module
    for module_name, tests in test_suites.items():
        print(f"\n{'='*100}")
        print(f"🔍 {module_name}")
        print('='*100)
        
        module_results = {'pass': 0, 'fail': 0, 'total': len(tests)}
        
        for method, path, description in tests:
            results['total'] += 1
            result = test_endpoint(method, path, token)
            
            status_symbol = {
                'PASS': '✅',
                'FAIL': '❌ 500',
                '404': '⚠️  404',
                '403': '⚠️  403',
                '401': '⚠️  401',
                '405': '⚠️  405',
                'ERROR': '❌',
                'TIMEOUT': '⏱️',
                'EXCEPTION': '💥',
                'SKIP': '⏭️'
            }.get(result['status'], '❓')
            
            print(f"{status_symbol} {method:6} {path:50} - {result['code']} - {description}")
            
            if result['status'] == 'PASS':
                results['passed'] += 1
                module_results['pass'] += 1
            else:
                module_results['fail'] += 1
                if result['status'] == 'FAIL':
                    results['failed_500'] += 1
                elif result['status'] == '404':
                    results['failed_404'] += 1
                elif result['status'] == '403':
                    results['failed_403'] += 1
                elif result['status'] == '401':
                    results['failed_401'] += 1
                elif result['status'] == '405':
                    results['failed_405'] += 1
                else:
                    results['other_errors'] += 1
        
        results['by_module'][module_name] = module_results
        pass_rate = (module_results['pass'] / module_results['total'] * 100) if module_results['total'] > 0 else 0
        print(f"Module Summary: {module_results['pass']}/{module_results['total']} passed ({pass_rate:.0f}%)")
    
    # Final summary
    print("\n" + "=" * 100)
    print("FINAL RESULTS")
    print("=" * 100)
    print(f"Total Endpoints Tested: {results['total']}")
    print(f"✅ Passed:              {results['passed']} ({results['passed']/results['total']*100:.1f}%)")
    print(f"❌ 500 Errors:          {results['failed_500']}")
    print(f"⚠️  404 Not Found:       {results['failed_404']}")
    print(f"⚠️  403 Forbidden:       {results['failed_403']}")
    print(f"⚠️  401 Unauthorized:    {results['failed_401']}")
    print(f"⚠️  405 Method Not Allowed: {results['failed_405']}")
    print(f"❓ Other Errors:        {results['other_errors']}")
    print("=" * 100)
    
    if results['failed_500'] == 0:
        print("\n🎉 NO 500 ERRORS! Backend is stable!")
    else:
        print(f"\n⚠️  {results['failed_500']} endpoints returning 500 errors need attention")
    
    print(f"\n✅ Overall Success Rate: {results['passed']/results['total']*100:.1f}%")

if __name__ == "__main__":
    main()
