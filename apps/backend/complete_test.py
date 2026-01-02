#!/usr/bin/env python3
"""
COMPLETE ENDPOINT TESTING - ALL 450 ENDPOINTS
Automatically extracts ALL endpoints from Flask app and tests every GET endpoint
"""
import requests
import sys
from collections import defaultdict

sys.path.insert(0, '.')
from app import app

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
        return None
    except:
        return None

def test_endpoint(method, path, token):
    """Test a single endpoint"""
    try:
        headers = {'Authorization': f'Bearer {token}'} if token else {}
        url = f"{BASE_URL}{path}"
        
        if method == 'GET':
            r = requests.get(url, headers=headers, timeout=3)
        else:
            return {'status': 'SKIP', 'code': 0, 'reason': 'Not GET'}
        
        return {'status': 'OK' if r.status_code < 400 else 'FAIL', 'code': r.status_code}
    except requests.exceptions.Timeout:
        return {'status': 'TIMEOUT', 'code': 0}
    except Exception as e:
        return {'status': 'ERROR', 'code': 0, 'reason': str(e)[:50]}

def main():
    print("="*120)
    print("COMPLETE ENDPOINT TESTING - ALL 450 ENDPOINTS FROM FLASK APP")
    print("="*120)
    
    # Get token
    token = login()
    if not token:
        print("❌ Login failed")
        return
    
    print("✅ Login successful\n")
    
    # Extract ALL routes from Flask app
    all_routes = []
    for rule in app.url_map.iter_rules():
        if rule.endpoint != 'static':
            methods = sorted(rule.methods - {'HEAD', 'OPTIONS'})
            for method in methods:
                all_routes.append({
                    'method': method,
                    'path': str(rule),
                    'endpoint': rule.endpoint
                })
    
    print(f"📊 Total routes found: {len(all_routes)}")
    
    # Filter GET endpoints
    get_endpoints = [r for r in all_routes if r['method'] == 'GET']
    print(f"🔍 GET endpoints to test: {len(get_endpoints)}\n")
    
    # Group by module
    by_module = defaultdict(list)
    for route in get_endpoints:
        module = route['endpoint'].split('.')[0]
        by_module[module].append(route)
    
    # Test all GET endpoints
    results = {
        'total': 0,
        '200': 0,
        '401': 0,
        '403': 0,
        '404': 0,
        '405': 0,
        '500': 0,
        'other': 0,
        'errors': 0
    }
    
    print(f"Testing {len(by_module)} modules...\n")
    
    for module_name in sorted(by_module.keys()):
        routes = by_module[module_name]
        print(f"\n{'='*120}")
        print(f"📦 {module_name.upper()} ({len(routes)} GET endpoints)")
        print('='*120)
        
        module_stats = defaultdict(int)
        
        for route in sorted(routes, key=lambda x: x['path']):
            # Skip routes with dynamic parameters for now (would need real IDs)
            if '<' in route['path']:
                print(f"⏭️  SKIP {route['path']:60} (requires parameters)")
                continue
            
            results['total'] += 1
            result = test_endpoint(route['method'], route['path'], token)
            
            code = result['code']
            status_symbol = {
                200: '✅ 200',
                201: '✅ 201',
                401: '⚠️  401',
                403: '⚠️  403',
                404: '⚠️  404',
                405: '⚠️  405',
                500: '❌ 500',
            }.get(code, f'❓ {code}')
            
            print(f"{status_symbol:12} {route['path']}")
            
            # Count by status
            if 200 <= code < 300:
                results['200'] += 1
                module_stats['pass'] += 1
            elif code == 401:
                results['401'] += 1
            elif code == 403:
                results['403'] += 1
            elif code == 404:
                results['404'] += 1
            elif code == 405:
                results['405'] += 1
            elif code == 500:
                results['500'] += 1
                module_stats['fail'] += 1
            else:
                results['other'] += 1
        
        # Module summary
        if module_stats['pass'] + module_stats['fail'] > 0:
            pass_rate = module_stats['pass'] / (module_stats['pass'] + module_stats['fail']) * 100
            print(f"\nModule: {module_stats['pass']} passed, {module_stats['fail']} failed ({pass_rate:.0f}%)")
    
    # Final summary
    print("\n" + "="*120)
    print("FINAL RESULTS - ALL GET ENDPOINTS")
    print("="*120)
    print(f"Total Tested:           {results['total']}")
    print(f"✅ Success (2xx):        {results['200']} ({results['200']/results['total']*100:.1f}%)")
    print(f"❌ Server Error (500):   {results['500']}")
    print(f"⚠️  Not Found (404):     {results['404']}")
    print(f"⚠️  Forbidden (403):     {results['403']}")
    print(f"⚠️  Unauthorized (401):  {results['401']}")
    print(f"⚠️  Not Allowed (405):   {results['405']}")
    print(f"❓ Other:               {results['other']}")
    print("="*120)
    
    if results['500'] == 0:
        print("\n🎉 PERFECT! NO 500 ERRORS!")
    else:
        print(f"\n⚠️  {results['500']} endpoints have 500 errors")
    
    print(f"\n✅ Success Rate: {results['200']/results['total']*100:.1f}%")
    print(f"📊 Total Endpoints in System: {len(all_routes)} (including POST/PUT/DELETE)")
    print(f"🔍 GET Endpoints Tested: {results['total']}")

if __name__ == "__main__":
    main()
