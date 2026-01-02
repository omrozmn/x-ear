#!/usr/bin/env python3
"""
ULTIMATE ENDPOINT TESTING - ALL 450+ ENDPOINTS
Tests every single route registered in the Flask app.
Handles parameterized routes by attempting to find/guess valid IDs.
"""
import requests
import sys
import json
import base64
from collections import defaultdict

# Add backend directory to path
sys.path.insert(0, '.')
from app import app
from models.base import db
from models.user import User
from models.patient import Patient
from models.sales import Sale
from models.inventory import InventoryItem as Inventory
from models.device import Device
from models.branch import Branch

BASE_URL = 'http://localhost:5003'

def login():
    try:
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin@x-ear.com",
            "password": "admin123"
        })
        if r.status_code == 200:
            return r.json()['access_token']
        return None
    except:
        return None

def get_dummy_ids():
    ids = {}
    with app.app_context():
        # Get one of each major model to use as parameters
        patient = Patient.query.first()
        if patient: ids['patient_id'] = patient.id
        
        sale = Sale.query.first()
        if sale: ids['sale_id'] = sale.id
        
        item = Inventory.query.first()
        if item: 
            ids['inventory_id'] = item.id
            ids['product_id'] = item.id
            
        device = Device.query.first()
        if device: ids['device_id'] = device.id
        
        branch = Branch.query.first()
        if branch: ids['branch_id'] = branch.id
        
        user = User.query.filter_by(email='admin@x-ear.com').first()
        if user: ids['user_id'] = user.id
            
    return ids

def resolve_path(path, ids):
    """Replace <param> with actual IDs"""
    new_path = path
    replacements = {
        '<patient_id>': ids.get('patient_id', 'dummy_patient'),
        '<sale_id>': ids.get('sale_id', 'dummy_sale'),
        '<int:sale_id>': ids.get('sale_id', '1'),
        '<inventory_id>': ids.get('inventory_id', 'dummy_inventory'),
        '<product_id>': ids.get('product_id', 'dummy_product'),
        '<device_id>': ids.get('device_id', 'dummy_device'),
        '<branch_id>': ids.get('branch_id', 'dummy_branch'),
        '<user_id>': ids.get('user_id', 'dummy_user'),
        '<notification_id>': 'dummy_notif',
        '<invoice_id>': '1',
        '<int:invoice_id>': '1',
        '<int:supplier_id>': '1',
        '<document_id>': 'dummy_doc',
        '<filename>': 'test.txt',
        '<tenant_id>': 'dummy_tenant'
    }
    for placeholder, val in replacements.items():
        if placeholder in new_path:
            new_path = new_path.replace(placeholder, str(val))
    
    # Generic replacement for any remaining <...>
    import re
    new_path = re.sub(r'<[^>]+>', '1', new_path)
    return new_path

def test_endpoint(method, path, token):
    try:
        headers = {'Authorization': f'Bearer {token}'} if token else {}
        url = f"{BASE_URL}{path}"
        
        # Add common params for some endpoints that require them
        if 'notifications' in path and 'user_id' not in path:
            url += ('?' if '?' not in url else '&') + 'user_id=usr_8117769e'
            
        if method == 'GET':
            r = requests.get(url, headers=headers, timeout=5)
        elif method == 'POST':
            # Empty POST usually safe to test for 500s
            r = requests.post(url, headers=headers, json={}, timeout=5)
        elif method == 'PUT':
            # Empty PUT to test for 500s
            r = requests.put(url, headers=headers, json={}, timeout=5)
        elif method == 'DELETE':
            # DELETE to test for 500s
            r = requests.delete(url, headers=headers, timeout=5)
        elif method == 'PATCH':
            # PATCH to test for 500s
            r = requests.patch(url, headers=headers, json={}, timeout=5)
        else:
            return {'status': 'SKIP_METHOD', 'code': 0}
        
        return {'status': 'OK' if r.status_code < 500 else 'FAIL', 'code': r.status_code, 'text': r.text[:100]}
    except Exception as e:
        return {'status': 'EXCEPTION', 'code': 0, 'text': str(e)}

def main():
    token = login()
    if not token:
        print("❌ Login failed")
        return
    
    ids = get_dummy_ids()
    print(f"Loaded dummy IDs: {ids}")
    
    all_routes = []
    for rule in app.url_map.iter_rules():
        if rule.endpoint != 'static':
            methods = rule.methods - {'HEAD', 'OPTIONS'}
            for method in methods:
                all_routes.append({
                    'method': method,
                    'path': str(rule),
                    'endpoint': rule.endpoint
                })
    
    print(f"\n📊 Total routes to analyze: {len(all_routes)}")
    
    results = defaultdict(list)
    
    for route in all_routes:
        resolved_path = resolve_path(route['path'], ids)
        res = test_endpoint(route['method'], resolved_path, token)
        
        route_info = {
            'original_path': route['path'],
            'resolved_path': resolved_path,
            'method': route['method'],
            'status': res['status'],
            'code': res['code'],
            'text': res['text'] if 'text' in res else ''
        }
        results[res['status']].append(route_info)
        
        # Print failures immediately
        if res['status'] == 'FAIL' or (res['status'] == 'OK' and res['code'] >= 500):
            print(f"❌ 500 at {route['method']} {resolved_path}: {res['text']}")
        elif res['code'] == 404:
            # Low priority but good to see
            pass
            
    # Print Summary
    print("\n" + "="*50)
    print("FINAL SUMMARY")
    print("="*50)
    total_tested = sum(len(v) for v in results.values())
    print(f"Total Routes Checked: {total_tested}")
    print(f"✅ Success (Non-500):  {len(results['OK'])}")
    print(f"❌ Server Errors (500): {len(results['FAIL'])}")
    print(f"⏭️  Skipped Methods:   {len(results['SKIP_METHOD'])}")
    
    if results['FAIL']:
        print("\nLista of 500 Errors:")
        for r in results['FAIL']:
            print(f"- {r['method']} {r['original_path']} -> {r['code']}")
            
    # Detailed counts by code for 'OK'
    codes = defaultdict(int)
    for r in results['OK']:
        codes[r['code']] += 1
    
    print("\nBreakdown of non-500 codes:")
    for code in sorted(codes.keys()):
        print(f"  {code}: {codes[code]}")

if __name__ == "__main__":
    main()
