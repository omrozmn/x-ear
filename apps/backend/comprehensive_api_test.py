
import sys
import os
import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:5003"
ADMIN_EMAIL = "admin@x-ear.com"
ADMIN_PASSWORD = "password123"

# Colors for output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_result(name, success, details=None):
    if success:
        print(f"{Colors.OKGREEN}[PASS] {name}{Colors.ENDC}")
    else:
        print(f"{Colors.FAIL}[FAIL] {name} - {details}{Colors.ENDC}")

def get_token(role, email, password):
    url = f"{BASE_URL}/api/auth/login"
    if role == 'admin':
        url = f"{BASE_URL}/api/admin/auth/login"
    
    # Try login
    payload = {"email": email, "password": password}
    try:
        r = requests.post(url, json=payload)
        if r.status_code == 200:
            return r.json().get('data', {}).get('token') or r.json().get('access_token')
        else:
            print_result(f"Login {role}", False, f"Status: {r.status_code}, Resp: {r.text}")
            return None
    except Exception as e:
        print_result(f"Login {role}", False, str(e))
        return None

def test_admin_panel(token):
    headers = {"Authorization": f"Bearer {token}"}
    print(f"\n{Colors.HEADER}--- Testing Admin Panel ---{Colors.ENDC}")
    
    # 1. Get Dashboard Metrics (might not exist, check routes)
    # Using specific routes found in app.py
    r = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
    print_result("Admin List Users", r.status_code == 200, f"Count: {len(r.json().get('data', {}).get('users', [])) if r.status_code==200 else 'N/A'}")

    r = requests.get(f"{BASE_URL}/api/admin/tenants", headers=headers)
    print_result("Admin List Tenants", r.status_code == 200, f"Count: {len(r.json().get('data', {}).get('tenants', [])) if r.status_code==200 else 'N/A'}")
    
    r = requests.get(f"{BASE_URL}/api/admin/roles", headers=headers)
    print_result("Admin List Roles", r.status_code == 200, f"Count: {len(r.json().get('data', {}).get('roles', [])) if r.status_code==200 else 'N/A'}")

def test_crm_panel(token):
    headers = {"Authorization": f"Bearer {token}"}
    print(f"\n{Colors.HEADER}--- Testing CRM Panel ---{Colors.ENDC}")
    
    # 1. Get Patients
    r = requests.get(f"{BASE_URL}/api/patients", headers=headers)
    data = r.json()
    if isinstance(data, list):
        count = len(data)
    elif isinstance(data, dict):
        inner_data = data.get('data')
        if isinstance(inner_data, list):
            count = len(inner_data)
        elif isinstance(inner_data, dict):
            # Try patients key, or keys might be paginated
            count = len(inner_data.get('patients', inner_data.get('items', [])))
        else:
            count = 0
    else:
        count = 0
    print_result("CRM List Patients", r.status_code == 200, f"Count: {count}")
    
    # Create Patient (Minimal fields)
    patient_data = {
        "firstName": "Test",
        "lastName": "Patient",
        "phone": f"0555{datetime.now().strftime('%H%M%S')}",
        "email": f"test_{datetime.now().strftime('%H%M%S')}@example.com",
        "gender": "male",
        "birthDate": "1990-01-01"
    }
    r = requests.post(f"{BASE_URL}/api/patients", json=patient_data, headers=headers)
    print_result("CRM Create Patient", r.status_code == 201, r.text[:100])
    resp_json = r.json()
    
    patient_id = None
    if isinstance(resp_json, dict):
        if 'id' in resp_json:
            patient_id = resp_json['id']
        elif 'data' in resp_json:
            inner = resp_json['data']
            if isinstance(inner, dict):
                patient_id = inner.get('id')
            elif isinstance(inner, list) and len(inner) > 0 and isinstance(inner[0], dict):
                 # unlikely but possible
                 patient_id = inner[0].get('id')

    if patient_id:
        # Update Patient
        update_data = {"firstName": "Updated"}
        r = requests.put(f"{BASE_URL}/api/patients/{patient_id}", json=update_data, headers=headers)
        print_result("CRM Update Patient", r.status_code == 200, r.text[:100])

    r = requests.get(f"{BASE_URL}/api/inventory", headers=headers)
    inv_data = r.json()
    if isinstance(inv_data, list):
        inv_count = len(inv_data)
    elif isinstance(inv_data, dict):
        inner = inv_data.get('data')
        if isinstance(inner, list):
            inv_count = len(inner)
        elif isinstance(inner, dict):
            inv_count = len(inner.get('items', inner.get('inventory', [])))
        else:
             inv_count = 0
    else:
        inv_count = 0
    print_result("CRM List Inventory", r.status_code == 200, f"Count: {inv_count}")

    r = requests.get(f"{BASE_URL}/api/suppliers", headers=headers)
    sup_data = r.json()
    if isinstance(sup_data, list):
        sup_count = len(sup_data)
    elif isinstance(sup_data, dict):
        inner = sup_data.get('data')
        if isinstance(inner, list):
            sup_count = len(inner)
        elif isinstance(inner, dict):
            sup_count = len(inner.get('suppliers', inner.get('items', [])))
        else:
            sup_count = 0
    else:
        sup_count = 0
    print_result("CRM List Suppliers", r.status_code == 200, f"Count: {sup_count}")

    # --- CRM Dashboard & Stats ---
    # Test Dashboard main endpoint
    resp = requests.get(f"{BASE_URL}/api/dashboard", headers=headers)
    print_result("CRM Dashboard Stats", resp.status_code == 200, f"Status: {resp.status_code}, Resp: {resp.text}" if resp.status_code != 200 else None)

    # Test Dashboard KPIs
    resp = requests.get(f"{BASE_URL}/api/dashboard/kpis", headers=headers)
    print_result("CRM Dashboard KPIs", resp.status_code == 200, f"Status: {resp.status_code}, Resp: {resp.text}" if resp.status_code != 200 else None)

    # --- CRM Invoices ---
    # Access invoices (using admin route or regular route depending on permission)
    # Trying admin route as we are logged in as admin
    resp = requests.get(f"{BASE_URL}/api/admin/invoices", params={"page": 1, "per_page": 10}, headers=headers)
    if resp.status_code == 200:
        print_result("CRM List Invoices (Admin Route)", True)
    else:
        # Fallback to standard route if admin one fails or not exists for this user context
        resp = requests.get(f"{BASE_URL}/api/invoices", params={"page": 1, "per_page": 10}, headers=headers)
        print_result("CRM List Invoices (Standard Route)", resp.status_code == 200, f"Status: {resp.status_code}, Resp: {resp.text}" if resp.status_code != 200 else None)

    # --- CRM Appointments ---
    resp = requests.get(f"{BASE_URL}/api/appointments", params={"page": 1, "per_page": 10}, headers=headers)
    print_result("CRM List Appointments", resp.status_code == 200, f"Status: {resp.status_code}, Resp: {resp.text}" if resp.status_code != 200 else None)

    # --- CRM Settings ---
    resp = requests.get(f"{BASE_URL}/api/settings", headers=headers)
    print_result("CRM Settings", resp.status_code == 200, f"Status: {resp.status_code}, Resp: {resp.text}" if resp.status_code != 200 else None)

def test_affiliate_panel():
    print(f"\n{Colors.HEADER}--- Testing Affiliate Panel ---{Colors.ENDC}")
    
    # Register (Singular /api/affiliate)
    register_url = f"{BASE_URL}/api/affiliate/register"
    email = f"aff_{datetime.now().strftime('%H%M%S')}@example.com"
    payload = {
        "email": email,
        "password": "password123"
    }
    r = requests.post(register_url, json=payload)
    print_result("Affiliate Register", r.status_code == 201, r.text)
    
    if r.status_code == 201:
        # Login (Singular /api/affiliate)
        login_url = f"{BASE_URL}/api/affiliate/login"
        r = requests.post(login_url, json={"email": email, "password": "password123"})
        print_result("Affiliate Login", r.status_code == 200, r.text[:100])
        # Affiliate login returns id, email (no token yet? Wait, check affiliate_flask.py)
        # It returns {'id': ..., 'email': ...} but NO token?
        # Check affiliate_flask.py again. Line 38: jsonify({'id': user.id, 'email': user.email})
        # If no JWT is returned, how is auth handled?
        # Affiliate dashboard might not be protected via JWT or uses a different mechanism?
        # Ah, affiliate_flask.py:44 get_me takes `affiliate_id` query param!
        # It seems 'v0' implementation is very basic and doesn't use JWT for affiliate yet?
        # I will use the returned ID to query dashboard.
        
        aff_id = r.json().get('id')
        if aff_id:
            # Dashboard / Me
            r = requests.get(f"{BASE_URL}/api/affiliate/me?affiliate_id={aff_id}")
            print_result("Affiliate Me Info", r.status_code == 200, r.text[:100])

def test_landing_panel():
    print(f"\n{Colors.HEADER}--- Testing Landing Panel (Registration) ---{Colors.ENDC}")
    
    # Test Phone Registration (send OTP)
    # We use a completely random phone number to avoid rate limits or conflicts
    import random
    phone = f"555{random.randint(1000000, 9999999)}"
    
    payload = {
        "phone": phone
    }
    
    resp = requests.post(f"{BASE_URL}/api/register-phone", json=payload)
    print_result("Landing Register Phone (OTP Generation)", resp.status_code == 200, f"Status: {resp.status_code} - {resp.text}" if resp.status_code != 200 else None)

def main():
    print(f"Starting API Verification against {BASE_URL}")
    
    # 1. Test Admin Role (Super Admin)
    # Note: Admin uses /api/admin/auth/login
    admin_token = get_token('admin', ADMIN_EMAIL, ADMIN_PASSWORD)
    if admin_token:
        test_admin_panel(admin_token)
    else:
        print(f"{Colors.FAIL}Skipping Admin Panel tests due to login failure{Colors.ENDC}")

    # 2. Test Tenant Admin Role (CRM)
    # Note: CRM uses /auth/login (or /api/auth/login depending on blueprint prefix, usually /api/auth in v0)
    # Check if admin@x-ear.com can log in to CRM (User table).
    # Based on previous turn, we synced them.
    crm_token = get_token('user', ADMIN_EMAIL, ADMIN_PASSWORD)
    if crm_token:
        test_crm_panel(crm_token)
    else:
        print(f"{Colors.FAIL}Skipping CRM Panel tests due to login failure{Colors.ENDC}")

    # 4. Test Landing Role
    test_landing_panel()

    # 5. Test Extended CRM/Admin Endpoints (Manual/Hardcoded Paths)
    # We reuse the admin token or crm token depending on the route requirements
    if crm_token:
        test_invoices_detailed_routes(crm_token)
        test_sgk_routes_existence(crm_token)
        test_communications_routes_existence(crm_token)
        test_efatura_routes_existence(crm_token)

def test_invoices_detailed_routes(token):
    print(f"\n{Colors.HEADER}--- Testing Detailed Invoice Routes (Manual/Hardcoded) ---{Colors.ENDC}")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. /api/admin/invoices (GET) - Used in invoice.service.ts
    url = f"{BASE_URL}/api/admin/invoices"
    r = requests.get(url, headers=headers)
    print_result(f"GET {url}", r.status_code == 200, f"Status: {r.status_code}, Body: {r.text}")

    # 2. /api/invoices (POST) - Outbox check
    # We'll just check if it exists (400 Bad Request is good, 404 is bad)
    url = f"{BASE_URL}/api/invoices"
    r = requests.post(url, headers=headers, json={}) 
    # Expect 400 or 422 validation error, or 201 if empty payload is somehow accepted (unlikely)
    exists = r.status_code != 404
    print_result(f"POST {url} (Existence Check)", exists, f"Status: {r.status_code}")

    # 3. /api/invoices/<id>/send-to-gib (POST)
    url = f"{BASE_URL}/api/invoices/dummy-id/send-to-gib"
    r = requests.post(url, headers=headers, json={})
    exists = r.status_code != 404
    print_result(f"POST {url} (Existence Check)", exists, f"Status: {r.status_code}")

def test_communications_routes_existence(token):
    print(f"\n{Colors.HEADER}--- Testing Communications Routes ---{Colors.ENDC}")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. /api/communications/messages (GET)
    url = f"{BASE_URL}/api/communications/messages"
    r = requests.get(url, headers=headers)
    # This might require query params like 'since', but 400 is fine, 404 is fail.
    exists = r.status_code != 404
    print_result(f"GET {url}", exists, f"Status: {r.status_code}")
    
    # 2. /api/communications/templates (GET)
    url = f"{BASE_URL}/api/communications/templates"
    r = requests.get(url, headers=headers)
    exists = r.status_code != 404
    print_result(f"GET {url}", exists, f"Status: {r.status_code}")

def test_sgk_routes_existence(token):
    print(f"\n{Colors.HEADER}--- Testing SGK Routes ---{Colors.ENDC}")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. /api/sgk/documents (POST)
    url = f"{BASE_URL}/api/sgk/documents"
    r = requests.post(url, headers=headers, json={})
    exists = r.status_code != 404
    print_result(f"POST {url} (Existence Check)", exists, f"Status: {r.status_code}")

    # 2. /api/ocr/process (POST)
    url = f"{BASE_URL}/api/ocr/process"
    r = requests.post(url, headers=headers, json={})
    exists = r.status_code != 404
    print_result(f"POST {url} (Existence Check)", exists, f"Status: {r.status_code}")
    
    # 3. /api/sgk/workflows/<id>/status (PUT)
    url = f"{BASE_URL}/api/sgk/workflows/dummy/status"
    r = requests.put(url, headers=headers, json={})
    exists = r.status_code != 404
    print_result(f"PUT {url} (Existence Check)", exists, f"Status: {r.status_code}")

def test_efatura_routes_existence(token):
    print(f"\n{Colors.HEADER}--- Testing E-Fatura Routes ---{Colors.ENDC}")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. /api/EFatura/Create (POST) - Note capitalization in service file
    # We should test case sensitivity too if possible, but standard is usually lowercase in flask unless strict
    url = f"{BASE_URL}/api/EFatura/Create" 
    r = requests.post(url, headers=headers, json={})
    exists = r.status_code != 404
    print_result(f"POST {url} (Existence Check)", exists, f"Status: {r.status_code}")

    # Try lowercase variant if the above fails, just in case
    if r.status_code == 404:
        url_lower = f"{BASE_URL}/api/efatura/create"
        r_lower = requests.post(url_lower, headers=headers, json={})
        if r_lower.status_code != 404:
            print_result(f"POST {url_lower} (Lowercase Variant)", True, "Lowercase route exists")

    # 2. /api/EFatura/Retry/<id>
    url = f"{BASE_URL}/api/EFatura/Retry/dummy-id"
    r = requests.post(url, headers=headers)
    exists = r.status_code != 404
    print_result(f"POST {url} (Existence Check)", exists, f"Status: {r.status_code}")

if __name__ == "__main__":
    main()
