#!/usr/bin/env python3
"""
Phase 1 Verification Script
Tests the refactored patients endpoints for proper unified access control.
"""
import requests

BASE_URL = "http://localhost:5003"

def test_health():
    """Test server is running"""
    print("\n🔍 Testing server health...")
    try:
        resp = requests.get(f"{BASE_URL}/api/health", timeout=2)
        if resp.status_code == 200:
            print("✅ Server is healthy")
            return True
        else:
            print(f"❌ Health check failed: {resp.status_code}")
            return False
    except Exception as e:
        print(f"❌ Server not reachable: {e}")
        return False

def test_patients_list_no_auth():
    """Test patients list without authentication (should fail)"""
    print("\n🔍 Testing /api/patients without auth...")
    try:
        resp = requests.get(f"{BASE_URL}/api/patients", timeout=2)
        if resp.status_code == 401:
            print("✅ Correctly rejected unauthenticated request")
            return True
        else:
            print(f"❌ Expected 401, got {resp.status_code}")
            return False
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

def test_patients_list_with_tenant_token():
    """Test patients list with tenant user token"""
    print("\n🔍 Testing /api/patients with tenant token...")
    
    # First, let's try to get a token (you'll need to adjust credentials)
    print("⚠️  Please manually test with actual tenant credentials")
    print("   Example curl:")
    print('   curl -H "Authorization: Bearer <TENANT_TOKEN>" http://localhost:5003/api/patients')
    return None

def test_patients_list_with_admin_token():
    """Test patients list with super admin token"""
    print("\n🔍 Testing /api/patients with super admin token...")
    
    print("⚠️  Please manually test with actual admin credentials")
    print("   Example curl:")
    print('   curl -H "Authorization: Bearer <ADMIN_TOKEN>" http://localhost:5003/api/patients')
    return None

def test_import_structure():
    """Test that all modules can be imported"""
    print("\n🔍 Testing Python import structure...")
    try:
        import sys
        sys.path.insert(0, '/Users/omerozmen/Desktop/x-ear web app/x-ear/apps/backend')
        
        from routes.patients import patients_bp
        print(f"✅ Blueprint imported: {patients_bp.name}")
        
        # Check if routes are registered
        rules = [str(rule) for rule in patients_bp.url_map.iter_rules() if 'patients' in str(rule)]
        print(f"✅ Found {len(rules)} patient routes registered")
        
        return True
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("PHASE 1 VERIFICATION - Patients Endpoint Refactor")
    print("=" * 60)
    
    results = []
    
    # Automated tests
    results.append(("Health Check", test_health()))
    results.append(("No Auth Test", test_patients_list_no_auth()))
    
    # Manual test guidance
    test_patients_list_with_tenant_token()
    test_patients_list_with_admin_token()
    
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    for name, result in results:
        if result == True:
            print(f"✅ {name}")
        elif result == False:
            print(f"❌ {name}")
        else:
            print(f"⚠️  {name} - Manual verification needed")
    
    print("\n" + "=" * 60)
    print("MANUAL VERIFICATION REQUIRED:")
    print("=" * 60)
    print("1. Login as Tenant User → Check Patient List loads")
    print("2. Login as Tenant Admin → Check Patient List with branch filter")
    print("3. Login as Super Admin → Check Patient List shows all tenants")
    print("4. Test Patient Detail page (GET /api/patients/<id>)")
    print("5. Test Patient Create/Update/Delete operations")
    print("6. Test Bulk Upload endpoint")
    print("=" * 60)
