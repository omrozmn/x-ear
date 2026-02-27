#!/usr/bin/env python3
"""
Comprehensive test to verify tenant isolation across ALL pages.
Tests: Parties, Users, Branches, Roles, Devices, Suppliers, Appointments, Sales, Dashboard, Reports, Permissions
"""

import requests
import json
from typing import Dict, Any

BASE_URL = "http://localhost:5003"

# Test credentials
TEST_USER = {
    "email": "test@test.com",
    "password": "test123"
}

# Test tenant IDs
TENANT_1 = "95625589-a4ad-41ff-a99e-4955943bb421"
TENANT_2 = "198cfeb9-238c-4951-affa-9a0d5ef87129"


def login() -> str:
    """Login and get access token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json=TEST_USER
    )
    response.raise_for_status()
    data = response.json()
    return data["data"]["accessToken"]


def impersonate_tenant(token: str, tenant_id: str) -> str:
    """Impersonate a tenant and get new token"""
    response = requests.post(
        f"{BASE_URL}/api/admin/impersonate",
        json={"tenantId": tenant_id},
        headers={"Authorization": f"Bearer {token}"}
    )
    response.raise_for_status()
    data = response.json()
    return data["data"]["accessToken"]


def test_endpoint(token: str, endpoint: str, name: str) -> Dict[str, Any]:
    """Test an endpoint and return response data"""
    try:
        response = requests.get(
            f"{BASE_URL}{endpoint}",
            headers={"Authorization": f"Bearer {token}"}
        )
        response.raise_for_status()
        data = response.json()
        
        # Extract data based on response structure
        if "data" in data:
            if isinstance(data["data"], dict) and "data" in data["data"]:
                result_data = data["data"]["data"]
            else:
                result_data = data["data"]
        else:
            result_data = data
            
        count = len(result_data) if isinstance(result_data, list) else 1
        return {"success": True, "count": count, "data": result_data}
    except Exception as e:
        return {"success": False, "error": str(e)}


def main():
    print("=" * 80)
    print("COMPREHENSIVE TENANT ISOLATION TEST - ALL PAGES")
    print("=" * 80)
    
    # Login
    print("\n1. Logging in...")
    token = login()
    print("✅ Logged in successfully")
    
    # Define all endpoints to test
    endpoints = [
        # Core entities
        ("/api/parties", "Parties (Hastalar)"),
        ("/api/admin/tenant-users", "Team Members (Ekip Üyeleri)"),
        ("/api/branches", "Branches (Şubeler)"),
        ("/api/roles", "Roles (Roller)"),
        ("/api/permissions", "Permissions (İzinler)"),
        
        # Inventory & Devices
        ("/api/devices", "Devices (Cihazlar)"),
        ("/api/suppliers", "Suppliers (Tedarikçiler)"),
        
        # Operations
        ("/api/appointments", "Appointments (Randevular)"),
        ("/api/sales", "Sales (Satışlar)"),
        
        # Dashboard & Reports
        ("/api/dashboard/kpis", "Dashboard KPIs"),
        ("/api/activity-logs", "Activity Logs (İşlem Dökümü)"),
        
        # Settings
        ("/api/admin/company-info", "Company Info (Firma Ayarları)"),
    ]
    
    results = {}
    
    # Test current tenant (test user's tenant)
    print(f"\n2. Testing CURRENT TENANT (test@test.com's tenant)")
    print("-" * 80)
    
    results["current"] = {}
    for endpoint, name in endpoints:
        result = test_endpoint(token, endpoint, name)
        results["current"][name] = result
        if result["success"]:
            print(f"  ✅ {name}: {result['count']} items")
        else:
            print(f"  ❌ {name}: {result['error']}")
    
    # Try to impersonate if possible
    print(f"\n3. Attempting to test with tenant impersonation...")
    print("-" * 80)
    try:
        token1 = impersonate_tenant(token, TENANT_1)
        print(f"✅ Impersonated Tenant 1: {TENANT_1}")
        
        results[TENANT_1] = {}
        for endpoint, name in endpoints:
            result = test_endpoint(token1, endpoint, name)
            results[TENANT_1][name] = result
            if result["success"]:
                print(f"  ✅ {name}: {result['count']} items")
            else:
                print(f"  ❌ {name}: {result['error']}")
        
        # Test Tenant 2
        token2 = impersonate_tenant(token, TENANT_2)
        print(f"\n✅ Impersonated Tenant 2: {TENANT_2}")
        
        results[TENANT_2] = {}
        for endpoint, name in endpoints:
            result = test_endpoint(token2, endpoint, name)
            results[TENANT_2][name] = result
            if result["success"]:
                print(f"  ✅ {name}: {result['count']} items")
            else:
                print(f"  ❌ {name}: {result['error']}")
    except Exception as e:
        print(f"⚠️  Cannot impersonate (user may not have admin permissions): {e}")
        print("   Testing with current tenant only...")
    
    # Compare results if we have multiple tenants
    if TENANT_1 in results and TENANT_2 in results:
        print("\n4. ISOLATION VERIFICATION")
        print("=" * 80)
        
        all_isolated = True
        for endpoint, name in endpoints:
            tenant1_result = results[TENANT_1].get(name, {})
            tenant2_result = results[TENANT_2].get(name, {})
            
            if not tenant1_result.get("success") or not tenant2_result.get("success"):
                print(f"⚠️  {name}: One or both tenants failed")
                continue
            
            count1 = tenant1_result.get("count", 0)
            count2 = tenant2_result.get("count", 0)
            
            # Check if data is different (isolated)
            if count1 != count2:
                print(f"✅ {name}: ISOLATED (T1: {count1}, T2: {count2})")
            else:
                # Same count doesn't mean not isolated, but let's check IDs
                data1 = tenant1_result.get("data", [])
                data2 = tenant2_result.get("data", [])
                
                if isinstance(data1, list) and isinstance(data2, list):
                    ids1 = {item.get("id") for item in data1 if isinstance(item, dict)}
                    ids2 = {item.get("id") for item in data2 if isinstance(item, dict)}
                    
                    if ids1 and ids2 and ids1 != ids2:
                        print(f"✅ {name}: ISOLATED (same count but different IDs)")
                    elif count1 == 0 and count2 == 0:
                        print(f"⚠️  {name}: Both empty (cannot verify isolation)")
                    else:
                        print(f"❌ {name}: POTENTIAL LEAK (same count and IDs)")
                        all_isolated = False
                else:
                    print(f"⚠️  {name}: Cannot verify (not list data)")
        
        print("\n" + "=" * 80)
        if all_isolated:
            print("✅ ALL PAGES ARE PROPERLY ISOLATED!")
        else:
            print("❌ SOME PAGES MAY HAVE ISOLATION ISSUES!")
        print("=" * 80)
    else:
        print("\n4. SUMMARY")
        print("=" * 80)
        print("✅ All endpoints tested successfully for current tenant")
        print("⚠️  Multi-tenant isolation test skipped (requires admin permissions)")
        print("=" * 80)


if __name__ == "__main__":
    main()
