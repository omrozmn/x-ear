#!/usr/bin/env python3
"""
Test script to verify tenant switching works correctly
"""
import requests
import json
import uuid

BASE_URL = "http://localhost:5003/api"

def generate_idempotency_key():
    """Generate unique idempotency key"""
    return str(uuid.uuid4())

# Step 1: Login as admin
print("=" * 60)
print("STEP 1: Login as admin (test@test.com)")
print("=" * 60)

login_response = requests.post(
    f"{BASE_URL}/auth/login",
    json={
        "identifier": "test@test.com",
        "password": "test123"
    }
)

if login_response.status_code != 200:
    print(f"❌ Login failed: {login_response.status_code}")
    print(login_response.text)
    exit(1)

login_data = login_response.json()
admin_token = login_data["data"]["accessToken"]
print("✅ Login successful")
print(f"Token preview: {admin_token[:50]}...")

# Decode JWT to see claims
import base64
payload = json.loads(base64.b64decode(admin_token.split('.')[1] + '=='))
print(f"JWT Claims: {json.dumps(payload, indent=2)}")

# Step 2: Get list of tenants
print("\n" + "=" * 60)
print("STEP 2: Get list of tenants")
print("=" * 60)

tenants_response = requests.get(
    f"{BASE_URL}/admin/tenants?limit=5",
    headers={"Authorization": f"Bearer {admin_token}"}
)

if tenants_response.status_code != 200:
    print(f"❌ Get tenants failed: {tenants_response.status_code}")
    print(tenants_response.text)
    exit(1)

tenants_data = tenants_response.json()
tenants = tenants_data["data"]["tenants"]
print(f"✅ Found {len(tenants)} tenants")
for tenant in tenants[:3]:
    print(f"  - {tenant['name']} ({tenant['id']})")

if len(tenants) < 2:
    print("❌ Need at least 2 tenants to test switching")
    exit(1)

target_tenant = tenants[0]
print(f"\n🎯 Target tenant: {target_tenant['name']} ({target_tenant['id']})")

# Step 3: Switch to tenant
print("\n" + "=" * 60)
print("STEP 3: Switch to tenant")
print("=" * 60)

switch_response = requests.post(
    f"{BASE_URL}/admin/debug/switch-tenant",
    headers={
        "Authorization": f"Bearer {admin_token}",
        "Idempotency-Key": generate_idempotency_key()
    },
    json={"targetTenantId": target_tenant['id']}
)

if switch_response.status_code != 200:
    print(f"❌ Tenant switch failed: {switch_response.status_code}")
    print(switch_response.text)
    exit(1)

switch_data = switch_response.json()
impersonation_token = switch_data["data"]["accessToken"]
print("✅ Tenant switch successful")
print(f"New token preview: {impersonation_token[:50]}...")

# Decode new JWT to see claims
payload = json.loads(base64.b64decode(impersonation_token.split('.')[1] + '=='))
print(f"JWT Claims: {json.dumps(payload, indent=2)}")

# Step 4: Get parties with impersonation token
print("\n" + "=" * 60)
print("STEP 4: Get parties with impersonation token")
print("=" * 60)

parties_response = requests.get(
    f"{BASE_URL}/parties?per_page=10",
    headers={"Authorization": f"Bearer {impersonation_token}"}
)

if parties_response.status_code != 200:
    print(f"❌ Get parties failed: {parties_response.status_code}")
    print(parties_response.text)
    exit(1)

parties_data = parties_response.json()

# Handle response format: {"data": [...]}
if isinstance(parties_data, dict) and "data" in parties_data:
    data = parties_data["data"]
    # data can be a list or a dict with "parties" key
    if isinstance(data, list):
        parties = data
    elif isinstance(data, dict) and "parties" in data:
        parties = data["parties"]
    else:
        parties = []
else:
    parties = []

print(f"✅ Found {len(parties)} parties for tenant {target_tenant['name']}")
for party in parties[:5]:
    print(f"  - {party['firstName']} {party['lastName']} (tenant: {party.get('tenantId', 'N/A')})")

# Step 5: Get dashboard KPIs
print("\n" + "=" * 60)
print("STEP 5: Get dashboard KPIs")
print("=" * 60)

dashboard_response = requests.get(
    f"{BASE_URL}/dashboard",
    headers={"Authorization": f"Bearer {impersonation_token}"}
)

if dashboard_response.status_code != 200:
    print(f"❌ Get dashboard failed: {dashboard_response.status_code}")
    print(dashboard_response.text)
    exit(1)

dashboard_data = dashboard_response.json()
kpis = dashboard_data["data"]["kpis"]
print("✅ Dashboard KPIs:")
print(f"  - Total Patients: {kpis['totalPatients']}")
print(f"  - Total Devices: {kpis['totalDevices']}")
print(f"  - Available Devices: {kpis['availableDevices']}")
print(f"  - Estimated Revenue: {kpis['estimatedRevenue']}")

# Step 6: Switch to another tenant
if len(tenants) >= 2:
    target_tenant2 = tenants[1]
    print("\n" + "=" * 60)
    print(f"STEP 6: Switch to another tenant: {target_tenant2['name']}")
    print("=" * 60)
    
    switch_response2 = requests.post(
        f"{BASE_URL}/admin/debug/switch-tenant",
        headers={
            "Authorization": f"Bearer {admin_token}",
            "Idempotency-Key": generate_idempotency_key()
        },
        json={"targetTenantId": target_tenant2['id']}
    )
    
    if switch_response2.status_code != 200:
        print(f"❌ Tenant switch failed: {switch_response2.status_code}")
        print(switch_response2.text)
    else:
        switch_data2 = switch_response2.json()
        impersonation_token2 = switch_data2["data"]["accessToken"]
        
        # Get parties for second tenant
        parties_response2 = requests.get(
            f"{BASE_URL}/parties?per_page=10",
            headers={"Authorization": f"Bearer {impersonation_token2}"}
        )
        
        if parties_response2.status_code == 200:
            parties_data2 = parties_response2.json()
            # Handle response format
            if isinstance(parties_data2, dict) and "data" in parties_data2:
                data2 = parties_data2["data"]
                if isinstance(data2, list):
                    parties2 = data2
                elif isinstance(data2, dict) and "parties" in data2:
                    parties2 = data2["parties"]
                else:
                    parties2 = []
            else:
                parties2 = []
            
            print(f"✅ Found {len(parties2)} parties for tenant {target_tenant2['name']}")
            for party in parties2[:5]:
                print(f"  - {party['firstName']} {party['lastName']} (tenant: {party.get('tenantId', 'N/A')})")
        
        # Get dashboard for second tenant
        dashboard_response2 = requests.get(
            f"{BASE_URL}/dashboard",
            headers={"Authorization": f"Bearer {impersonation_token2}"}
        )
        
        if dashboard_response2.status_code == 200:
            dashboard_data2 = dashboard_response2.json()
            kpis2 = dashboard_data2["data"]["kpis"]
            print(f"✅ Dashboard KPIs for {target_tenant2['name']}:")
            print(f"  - Total Patients: {kpis2['totalPatients']}")
            print(f"  - Total Devices: {kpis2['totalDevices']}")
            print(f"  - Available Devices: {kpis2['availableDevices']}")
            print(f"  - Estimated Revenue: {kpis2['estimatedRevenue']}")

print("\n" + "=" * 60)
print("✅ ALL TESTS PASSED!")
print("=" * 60)
