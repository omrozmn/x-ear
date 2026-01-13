"""
Enhanced API Endpoint Verification Script
=========================================
Verifies all Flask endpoints with VALID test data to achieve 100% 200 OK.
- Fetches real entity IDs from the database
- Sends appropriate payloads for POST/PUT/PATCH
- Handles authentication properly
"""
import sys
import os
# Add backend root to path to allow imports from app, models, etc.
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

import sys
import os
import json
import requests
import re
from datetime import datetime

sys.path.append(os.getcwd())

BASE_URL = "http://localhost:5003"

# =============================================================================
# AUTHENTICATION
# =============================================================================

def get_tokens():
    """Get tokens for both SuperAdmin and Tenant User"""
    tokens = {'admin': None, 'tenant': None}
    
    # 1. Get SuperAdmin token
    try:
        r = requests.post(f"{BASE_URL}/api/admin/auth/login", 
                         json={"email": "admin@x-ear.com", "password": "password123"}, 
                         timeout=5)
        if r.status_code == 200:
            data = r.json()
            token = data.get('data', {}).get('token')
            if token:
                tokens['admin'] = token
                print("✅ SuperAdmin login successful")
    except Exception as e:
        print(f"❌ SuperAdmin login failed: {e}")
    
    # 2. Get Tenant User token
    try:
        payload = {'identifier': 'crm_user@x-ear.com', 'password': 'password123'}
        r = requests.post(f"{BASE_URL}/api/auth/login", json=payload, timeout=5)
        if r.status_code == 200:
            data = r.json()
            token = data.get('data', {}).get('token') or data.get('access_token')
            if token:
                tokens['tenant'] = token
                print("✅ Tenant User login successful")
    except Exception as e:
        print(f"❌ Tenant User login failed: {e}")
    
    return tokens

def get_headers_for_path(path, tokens):
    """Return appropriate headers based on endpoint path"""
    # Use SuperAdmin token for /api/admin/* endpoints
    # Use Tenant User token for all other /api/* endpoints
    if path.startswith('/api/admin'):
        token = tokens.get('admin')
    else:
        # Strictly use tenant token for non-admin paths to ensure tenant_id is in logic
        token = tokens.get('tenant')
    
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers

# =============================================================================
# DYNAMIC ENTITY IDS (Fetch from API to ensure they exist)
# =============================================================================

def fetch_real_ids(headers):
    """Fetch real entity IDs from the API to use in path replacements"""
    ids = {
        'patient_id': '1',
        'user_id': '1',
        'sale_id': '1',
        'device_id': '1',
        'supplier_id': '1',
        'tenant_id': '1',
        'branch_id': '1',
        'invoice_id': '1',
        'appointment_id': '1',
        'category_id': '1',
        'brand_id': '1',
        'inventory_id': '1',
        'role_id': '1',
    }
    
    # Get current user ID to avoid deleting self
    current_user_id = None
    try:
        r = requests.get(f"{BASE_URL}/api/users/me", headers=headers, timeout=3)
        if r.status_code == 200:
            current_user_id = str(r.json().get('data', {}).get('id'))
            print(f"ℹ️  Current User ID: {current_user_id}")
    except Exception:
        pass

    # 1. Generic fetch from list endpoints
    endpoints_to_fetch = [
        ('/api/patients', 'patient_id'),
        ('/api/users', 'user_id'),
        ('/api/sales', 'sale_id'),
        ('/api/devices', 'device_id'),
        ('/api/suppliers', 'supplier_id'),
        ('/api/admin/tenants', 'tenant_id'),
        ('/api/branches', 'branch_id'),
        ('/api/appointments', 'appointment_id'),
        ('/api/inventory/categories', 'category_id'),
        ('/api/devices/brands', 'brand_id'),
        ('/api/inventory', 'inventory_id'),
        ('/api/roles', 'role_id'),
    ]
    
    for endpoint, id_key in endpoints_to_fetch:
        try:
            r = requests.get(f"{BASE_URL}{endpoint}", headers=headers, timeout=3)
            if r.status_code == 200:
                data = r.json()
                items = []
                
                # Handle various response formats
                raw_data = data.get('data', data)
                
                if isinstance(raw_data, list):
                    items = raw_data
                elif isinstance(raw_data, dict):
                    if 'tenants' in raw_data: items = raw_data['tenants']
                    elif 'users' in raw_data: items = raw_data['users']
                    elif isinstance(data, dict) and isinstance(data.get('data'), list): items = data['data']
                    else: items = [raw_data]
                
                if isinstance(items, list) and len(items) > 0:
                    found_id = None
                    for item in items:
                        if isinstance(item, dict) and 'id' in item:
                             item_id = str(item['id'])
                             # Avoid picking self for user_id
                             if id_key == 'user_id' and item_id == current_user_id:
                                 continue
                             found_id = item_id
                             break
                    
                    # If we couldn't find a non-self ID, validly fallback to create one later or use self (warning)
                    if found_id:
                         ids[id_key] = found_id
                    elif id_key == 'user_id' and current_user_id:
                         # Create a dummy user to test with instead
                         print("⚠️  Only found self. Creating dummy user for tests...")
                         dummy_payload = get_valid_payload('/api/users', 'POST', ids)
                         r_create = requests.post(f"{BASE_URL}/api/users", json=dummy_payload, headers=headers)
                         if r_create.status_code == 201:
                             ids[id_key] = str(r_create.json().get('data', {}).get('id'))
                             print(f"✅ Created dummy user: {ids[id_key]}")

        except Exception as e:
            # print(f"Error fetching {id_key}: {e}")
            pass
    
    print(f"📋 Fetched real IDs: {ids}")
    return ids

def replace_params(path, ids):
    """Replace flask route params with real entity IDs"""
    # Specific replacements first
    path = path.replace('<int:patient_id>', ids.get('patient_id', '1'))
    path = path.replace('<patient_id>', ids.get('patient_id', '1'))
    path = path.replace('<int:user_id>', ids.get('user_id', '1'))
    path = path.replace('<user_id>', ids.get('user_id', '1'))
    path = path.replace('<int:sale_id>', ids.get('sale_id', '1'))
    path = path.replace('<sale_id>', ids.get('sale_id', '1'))
    path = path.replace('<int:device_id>', ids.get('device_id', '1'))
    path = path.replace('<device_id>', ids.get('device_id', '1'))
    path = path.replace('<int:supplier_id>', ids.get('supplier_id', '1'))
    path = path.replace('<supplier_id>', ids.get('supplier_id', '1'))
    path = path.replace('<tenant_id>', ids.get('tenant_id', '1'))
    path = path.replace('<int:tenant_id>', ids.get('tenant_id', '1'))
    path = path.replace('<branch_id>', ids.get('branch_id', '1'))
    path = path.replace('<int:branch_id>', ids.get('branch_id', '1'))
    path = path.replace('<appointment_id>', ids.get('appointment_id', '1'))
    path = path.replace('<int:appointment_id>', ids.get('appointment_id', '1'))
    path = path.replace('<category_id>', ids.get('category_id', '1'))
    path = path.replace('<int:category_id>', ids.get('category_id', '1'))
    path = path.replace('<brand_id>', ids.get('brand_id', '1'))
    path = path.replace('<int:brand_id>', ids.get('brand_id', '1'))
    path = path.replace('<inventory_id>', ids.get('inventory_id', '1'))
    path = path.replace('<int:inventory_id>', ids.get('inventory_id', '1'))
    path = path.replace('<role_id>', ids.get('role_id', '1'))
    path = path.replace('<int:role_id>', ids.get('role_id', '1'))
    
    # Generic ID replacements
    path = path.replace('<int:id>', '1')
    path = path.replace('<string:id>', '1')
    path = path.replace('<id>', '1')
    path = path.replace('<uuid:id>', '00000000-0000-0000-0000-000000000001')
    
    # Catch-all for remaining params
    if '<' in path:
        path = re.sub(r'<[^>]+>', '1', path)
        
    return path

# =============================================================================
# VALID PAYLOADS PER ENDPOINT PATTERN
# =============================================================================


def get_valid_payload(path, method, ids={}):
    """Return a valid payload for the given endpoint using real IDs"""
    # Unique timestamp + random to avoid collisions
    import random
    ts = datetime.now().strftime('%H%M%S') + str(random.randint(10, 99))
    
    tenant_id = ids.get('tenant_id', '1')
    patient_id = ids.get('patient_id', 1)
    user_id = ids.get('user_id', 1)
    sale_id = ids.get('sale_id', 1)
    
    # Default minimal payloads by endpoint pattern
    payloads = {
        # Auth
        '/api/auth/login': {'identifier': 'test@example.com', 'password': 'testpass'},
        '/api/auth/register': {'email': f'newuser_{ts}@example.com', 'password': 'password123', 'username': f'newuser_{ts}'},
        '/api/auth/forgot-password': {'identifier': f'555{ts}00'},
        '/api/auth/reset-password': {'identifier': f'555{ts}00', 'otp': '123456', 'newPassword': 'newpass123'},
        
        # Patients
        '/api/patients': {
            'firstName': 'Test', 
            'lastName': 'Patient', 
            'phone': f'555{ts}00', 
            'tcNo': f'1{ts}0001', 
            'tenant_id': tenant_id,
            'status': 'LEAD',
            'gender': 'OTHER'
        },
        
        # User Admin & Tenant Users
        '/api/admin/users/all/<user_id>': {
            'email': f'updated_{ts}@example.com',
            'first_name': 'Updated',
            'last_name': 'Admin',
            'role': 'super_admin'
        },
        '/api/tenant/users': {
            'username': f'tuser_{ts}', 
            'email': f'tuser_{ts}@test.com', 
            'password': 'pass123',
            'first_name': 'Tenant',
            'last_name': 'User',
            'role': 'user',
            'is_active': True
        },
        
        # Users
        '/api/users': {'username': f'testuser_{ts}', 'password': 'password123', 'email': f'testuser_{ts}@example.com', 'role': 'admin', 'tenant_id': tenant_id},
        '/api/users/me/password': {'current_password': 'password123', 'new_password': 'newpass123'},
        '/api/users/me': {'first_name': 'UpdatedName', 'email': f'updated_{ts}@example.com'},

        # Devices
        '/api/devices': {'name': 'Test Device', 'serialNumber': f'SN{ts}', 'brandId': ids.get('brand_id', 1)},
        '/api/devices/brands': {'name': f'Test Brand {ts}'},
        
        # Inventory
        '/api/inventory': {'name': f'Test Product {ts}', 'sku': f'SKU-{ts}', 'quantity': 10, 'price': 100.0, 'categoryId': ids.get('category_id', 1)},
        '/api/inventory/categories': {'name': f'Test Category {ts}'},
        
        # Suppliers
        '/api/suppliers': {'name': f'Test Supplier {ts}', 'phone': f'555{ts}01', 'email': f'supplier_{ts}@test.com'},
        
        # Sales
        '/api/sales': {'patientId': patient_id, 'items': [], 'totalAmount': 0},
        '/api/sales/logs': {'saleId': sale_id, 'action': 'test', 'message': 'Test log'},
        '/api/sales/recalc': {'saleId': sale_id},
        '/api/sales/<sale_id>/payment-plan': {
            "totalAmount": 1000,
            "planType": "installment", 
            "installmentCount": 3,
            "downPayment": 100
        },
        
        # Branches
        '/api/branches': {'name': f'Test Branch {ts}', 'address': 'Test Address', 'city': 'Test City'},
        
        # Invoices
        '/api/invoices': {'patientId': patient_id, 'saleId': sale_id, 'number': f'INV-{ts}', 'date': '2026-01-01', 'amount': 100, 'items': []},
        '/api/invoices/batch-generate': {'saleIds': [sale_id]},
        '/api/invoices/print-queue': {'invoiceIds': [1]}, # No good ID usually
        '/api/invoices/templates': {'name': f'Template {ts}', 'content': '<html></html>'},
        
        # Notifications
        '/api/notifications': {
            'title': f'Test {ts}', 
            'message': 'Body', 
            'type': 'info', 
            'tenant_id': tenant_id
        },
        '/api/notifications/settings': {'userId': user_id, 'preferences': {}},
        
        # OCR
        '/api/ocr/debug_ner': {'text': 'Test text'},
        
        # General
        'default': {'name': f'Test Item {ts}'},
        
        # Admin
        '/api/admin/tenants': {'name': f'Tenant {ts}', 'domain': f'test{ts}.example.com', 'plan': 'basic', 'owner_email': f'owner{ts}@test.com', 'owner_name': 'Owner'},
        '/api/admin/users': {'username': 'adminuser', 'email': 'admin@test.com', 'password': 'pass123'},
        '/api/admin/plans': {'name': f'Plan {ts}', 'price': 99.0, 'duration': 30},
        '/api/admin/notifications/templates': {'name': f'Template {ts}', 'content': 'Test content', 'type': 'email'},
        '/api/admin/marketplaces/integrations': {'name': 'Test Integration', 'type': 'marketplace'},
        '/api/admin/campaigns': {'name': 'Test Campaign', 'type': 'email'},
        '/api/admin/addons': {'name': 'Test Addon', 'price': 10.0},
        '/api/admin/api-keys': {'name': 'Test API Key'},
        '/api/admin/suppliers': {'name': 'Test Supplier'},
        
        # Roles
        '/api/roles': {'name': f'role_{ts}', 'description': 'Test Role', 'permissions': []},
        
        # Activity logs
        '/api/activity-logs': {'action': 'test.action', 'message': 'Test activity'},
        
        # Upload
        '/api/upload/presigned': {'filename': 'test.pdf', 'contentType': 'application/pdf'},
        
        # Tenant
        '/api/tenant/users': {'username': 'tenantuser', 'email': 'tenant@test.com', 'password': 'pass123'},
        '/api/tenant/company': {'name': 'Test Company'},
        
        # SGK
        '/api/sgk/documents': {'type': 'test', 'data': {}},
        '/api/sgk/workflow/create': {'patientId': 1, 'type': 'standard'},
        '/api/sgk/e-receipt/query': {'tcNo': '12345678901'},
        '/api/sgk/patient-rights/query': {'tcNo': '12345678901'},
        
        # Subscriptions
        '/api/subscriptions/subscribe': {'planId': 1},
        '/api/subscriptions/register-and-subscribe': {'email': 'new@test.com', 'password': 'pass123', 'planId': 1},
        
        # UTS
        '/api/uts/registrations/bulk': {'registrations': []},
        
        # Verify
        '/api/verify-registration-otp': {'phone': '5551234567', 'otp': '123456'},
    }
    
    # Find matching payload
    for pattern, payload in payloads.items():
        if path == pattern or path.startswith(pattern.rstrip('/')):
            return payload
    
    # Default payload for unmatched endpoints
    return {'name': 'Test', 'value': 'test'}

# =============================================================================
# MAIN VERIFICATION LOGIC
# =============================================================================

def run_tests():
    try:
        from main import app
        print("📲 Loaded FastAPI App (via main.py)")
    except ImportError:
        print("❌ Could not import app. Make sure you are in backend dir.")
        return

    # Get both tokens
    tokens = get_tokens()
    
    # Use admin token for initial ID fetching
    admin_headers = {"Content-Type": "application/json"}
    if tokens.get('admin'):
        admin_headers["Authorization"] = f"Bearer {tokens['admin']}"
    
    # Fetch real entity IDs (using admin token)
    ids = fetch_real_ids(admin_headers)
    
    results = []
    passed = 0
    failed = 0
    
    print(f"\n🚀 Starting Enhanced API Verification against {BASE_URL}")
    print(f"🔒 SuperAdmin: {'✅' if tokens.get('admin') else '❌'}")
    print(f"🔒 Tenant User: {'✅' if tokens.get('tenant') else '❌'}\n")
    
    # Collect all routes
    routes = []
    with app.app_context():
        for rule in app.url_map.iter_rules():
            if rule.endpoint != 'static' and not rule.rule.startswith('/static'):
                methods = [m for m in rule.methods if m not in ('OPTIONS', 'HEAD')]
                for method in methods:
                    routes.append({'path': rule.rule, 'method': method})
    
    routes.sort(key=lambda x: (x['path'], x['method']))
    
    for route in routes:
        raw_path = route['path']
        method = route['method']
        path = replace_params(raw_path, ids)
        url = f"{BASE_URL}{path}"
        
        # Get appropriate headers for this endpoint
        headers = get_headers_for_path(raw_path, tokens)
        
        try:
            if method == 'GET':
                r = requests.get(url, headers=headers, timeout=5)
            elif method in ['POST', 'PUT', 'PATCH']:
                payload = get_valid_payload(raw_path, method, ids)
                r = requests.request(method, url, headers=headers, json=payload, timeout=5)
            elif method == 'DELETE':
                r = requests.delete(url, headers=headers, timeout=5)
            else:
                continue
                
            status = r.status_code
            res_text = r.text[:50].replace('\n', ' ')
            
            if 200 <= status < 300:
                indicator = "✅"
                passed += 1
            elif status >= 500:
                indicator = "❌"
                failed += 1
                print(f"\n❌ SERVER ERROR ({status}) in {method} {path}")
                print(f"Response: {r.text}\n") # Changed to print full response text
            else:
                indicator = "⚠️"
                passed += 1  # Non-500 is considered "working"
            
            results.append({
                "method": method,
                "path": raw_path,
                "status": status,
                "indicator": indicator,
                "details": res_text
            })
            
            print(f"{method:<8} {status:<8} {path:<60} {indicator} {res_text}...")
            
        except Exception as e:
            failed += 1
            print(f"{method:<8} ERROR    {path:<60} ❌ {str(e)[:40]}...")
            results.append({
                "method": method,
                "path": raw_path,
                "status": "ERROR",
                "indicator": "❌",
                "details": str(e)[:50]
            })
    
    # Summary
    total = len(results)
    ok_count = sum(1 for r in results if 200 <= (r['status'] if isinstance(r['status'], int) else 0) < 300)
    
    print("-" * 100)
    print(f"Summary: Verified {total} endpoints.")
    print(f"✅ 200-299 OK: {ok_count}")
    print(f"⚠️ 4xx Client Errors: {passed - ok_count}")
    print(f"❌ 5xx Server Errors: {failed}")
    
    # Save report
    with open('api_verification_results.md', 'w') as f:
        f.write("# API Verification Results\n\n")
        f.write(f"**Generated**: {datetime.now().isoformat()}\n\n")
        f.write(f"## Summary\n")
        f.write(f"- **Total Endpoints**: {total}\n")
        f.write(f"- **200-299 OK**: {ok_count}\n")
        f.write(f"- **4xx Client Errors**: {passed - ok_count}\n")
        f.write(f"- **5xx Server Errors**: {failed}\n\n")
        f.write("## Details\n\n")
        f.write("| Method | Path | Status | Indicator | Details |\n")
        f.write("|--------|------|--------|-----------|--------|\n")
        for r in results:
            path = r['path'].replace('|', '\\|')
            f.write(f"| **{r['method']}** | `{path}` | {r['status']} | {r['indicator']} | `{r['details'][:50]}` |\n")
    
    print(f"\n📝 Report saved to api_verification_results.md")

if __name__ == "__main__":
    run_tests()
