#!/usr/bin/env python3
"""
Comprehensive tenant isolation test
Tests all major endpoints to ensure tenant data is properly isolated
"""
import requests
import uuid

BASE_URL = "http://localhost:5003/api"

def generate_idempotency_key():
    return str(uuid.uuid4())

def test_endpoint(name, url, token, expected_tenant_id=None):
    """Test an endpoint and check if data is tenant-scoped"""
    print(f"\n{'='*60}")
    print(f"Testing: {name}")
    print(f"URL: {url}")
    print(f"{'='*60}")
    
    response = requests.get(
        url,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code != 200:
        print(f"❌ Request failed: {response.status_code}")
        print(response.text[:500])
        return False
    
    data = response.json()
    
    # Extract data array
    if isinstance(data, dict) and "data" in data:
        items = data["data"]
        if isinstance(items, dict):
            # Handle pagination format
            if "parties" in items:
                items = items["parties"]
            elif "users" in items:
                items = items["users"]
            elif "branches" in items:
                items = items["branches"]
            elif "roles" in items:
                items = items["roles"]
            elif "devices" in items:
                items = items["devices"]
            elif "suppliers" in items:
                items = items["suppliers"]
            elif "appointments" in items:
                items = items["appointments"]
            elif "sales" in items:
                items = items["sales"]
            else:
                items = []
        elif not isinstance(items, list):
            items = []
    else:
        items = []
    
    print(f"✅ Found {len(items)} items")
    
    # Check tenant_id if items exist
    if items and expected_tenant_id:
        for i, item in enumerate(items[:3]):  # Check first 3 items
            item_tenant = item.get('tenantId') or item.get('tenant_id')
            if item_tenant:
                if item_tenant == expected_tenant_id:
                    print(f"  ✅ Item {i+1}: tenant_id matches ({item_tenant})")
                else:
                    print(f"  ❌ Item {i+1}: WRONG tenant_id! Expected {expected_tenant_id}, got {item_tenant}")
                    return False
    
    return True

# Step 1: Login
print("="*60)
print("STEP 1: Login as admin")
print("="*60)

login_response = requests.post(
    f"{BASE_URL}/auth/login",
    json={"identifier": "test@test.com", "password": "test123"}
)

if login_response.status_code != 200:
    print(f"❌ Login failed: {login_response.status_code}")
    exit(1)

admin_token = login_response.json()["data"]["accessToken"]
print("✅ Login successful")

# Step 2: Get tenants
print("\n" + "="*60)
print("STEP 2: Get list of tenants")
print("="*60)

tenants_response = requests.get(
    f"{BASE_URL}/admin/tenants?limit=5",
    headers={"Authorization": f"Bearer {admin_token}"}
)

tenants = tenants_response.json()["data"]["tenants"]
print(f"✅ Found {len(tenants)} tenants")

if len(tenants) < 2:
    print("❌ Need at least 2 tenants to test")
    exit(1)

tenant1 = tenants[0]
tenant2 = tenants[1]

print(f"\n🎯 Tenant 1: {tenant1['name']} ({tenant1['id']})")
print(f"🎯 Tenant 2: {tenant2['name']} ({tenant2['id']})")

# Test both tenants
for tenant in [tenant1, tenant2]:
    print(f"\n{'#'*60}")
    print(f"# TESTING TENANT: {tenant['name']}")
    print(f"{'#'*60}")
    
    # Switch to tenant
    switch_response = requests.post(
        f"{BASE_URL}/admin/debug/switch-tenant",
        headers={
            "Authorization": f"Bearer {admin_token}",
            "Idempotency-Key": generate_idempotency_key()
        },
        json={"targetTenantId": tenant['id']}
    )
    
    if switch_response.status_code != 200:
        print("❌ Tenant switch failed")
        continue
    
    tenant_token = switch_response.json()["data"]["accessToken"]
    print(f"✅ Switched to tenant: {tenant['name']}")
    
    # Test all major endpoints
    endpoints = [
        ("Parties (Hastalar)", f"{BASE_URL}/parties?per_page=10"),
        ("Users (Kullanıcılar)", f"{BASE_URL}/users?per_page=10"),
        ("Branches (Şubeler)", f"{BASE_URL}/branches?per_page=10"),
        ("Roles (Roller)", f"{BASE_URL}/roles?per_page=10"),
        ("Devices (Cihazlar)", f"{BASE_URL}/devices?per_page=10"),
        ("Suppliers (Tedarikçiler)", f"{BASE_URL}/suppliers?per_page=10"),
        ("Appointments (Randevular)", f"{BASE_URL}/appointments?per_page=10"),
        ("Sales (Satışlar)", f"{BASE_URL}/sales?per_page=10"),
        ("Dashboard KPIs", f"{BASE_URL}/dashboard"),
    ]
    
    results = []
    for name, url in endpoints:
        success = test_endpoint(name, url, tenant_token, tenant['id'])
        results.append((name, success))
    
    # Summary for this tenant
    print(f"\n{'='*60}")
    print(f"SUMMARY FOR {tenant['name']}")
    print(f"{'='*60}")
    passed = sum(1 for _, success in results if success)
    total = len(results)
    print(f"Passed: {passed}/{total}")
    for name, success in results:
        status = "✅" if success else "❌"
        print(f"  {status} {name}")

print(f"\n{'#'*60}")
print("# ALL TESTS COMPLETED")
print(f"{'#'*60}")
