#!/usr/bin/env python3
"""
Test script to reproduce:
1. KDV (VAT) fields not saving in inventory
2. Device assignment 500 error
"""

import requests
from datetime import datetime

BASE_URL = "http://localhost:5003/api"

def login_as_super_admin():
    """Login as super admin"""
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "identifier": "admin@x-ear.com",
        "password": "admin123"
    })
    
    if response.status_code != 200:
        print(f"❌ Login failed: {response.status_code}")
        print(response.text)
        return None
    
    data = response.json()
    token = data.get("data", {}).get("accessToken")
    user_id = data.get("data", {}).get("user", {}).get("id")
    
    print("✅ Logged in as super admin")
    print(f"   User ID: {user_id}")
    print(f"   Token: {token[:50]}...")
    
    return token, user_id

def impersonate_tenant(token, tenant_id):
    """Impersonate a tenant"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Idempotency-Key": f"impersonate-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    }
    
    response = requests.post(
        f"{BASE_URL}/admin/impersonate",
        json={"tenant_id": tenant_id},
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"❌ Impersonation failed: {response.status_code}")
        print(response.text)
        return None
    
    data = response.json()
    new_token = data.get("data", {}).get("token") or data.get("data", {}).get("accessToken")
    
    if not new_token:
        print(f"❌ No token in response: {data}")
        return None
    
    print(f"✅ Impersonated tenant: {tenant_id}")
    print(f"   New token: {new_token[:50]}...")
    
    return new_token

def test_kdv_inventory_creation(token):
    """Test 1: Create inventory with KDV fields"""
    print("\n" + "="*60)
    print("TEST 1: Inventory Creation with KDV Fields")
    print("="*60)
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Idempotency-Key": f"inventory-create-{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
    }
    
    # Create inventory with KDV fields
    inventory_data = {
        "name": "Test Hearing Aid with KDV",
        "brand": "Test Brand",
        "model": "KDV-TEST-001",
        "category": "hearing_aid",
        "totalInventory": 10,
        "availableInventory": 10,
        "price": 10000.00,
        "cost": 8000.00,
        "vatRate": 18,  # Correct field name (alias for kdv_rate)
        "priceIncludesKdv": True,  # KDV dahil
        "costIncludesKdv": False,  # Maliyet KDV hariç
        "barcode": f"KDV-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "stockCode": f"KDV-SC-{datetime.now().strftime('%H%M%S')}",
        "features": ["Test feature 1", "Test feature 2"]
    }
    
    print("\n📤 Creating inventory with KDV fields:")
    print(f"   vatRate: {inventory_data['vatRate']}")
    print(f"   priceIncludesKdv: {inventory_data['priceIncludesKdv']}")
    print(f"   costIncludesKdv: {inventory_data['costIncludesKdv']}")
    
    response = requests.post(
        f"{BASE_URL}/inventory",
        json=inventory_data,
        headers=headers
    )
    
    print(f"\n📥 Response: {response.status_code}")
    
    if response.status_code not in [200, 201]:
        print("❌ Creation failed!")
        print(f"Response: {response.text}")
        return None
    
    data = response.json()
    inventory_id = data.get("data", {}).get("id")
    
    print(f"✅ Inventory created: {inventory_id}")
    
    # Read back to verify KDV fields
    print("\n📤 Reading back inventory to verify KDV fields...")
    
    response = requests.get(
        f"{BASE_URL}/inventory/{inventory_id}",
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"❌ Read failed: {response.status_code}")
        return inventory_id
    
    data = response.json()
    item = data.get("data", {})
    
    print("\n📥 Retrieved inventory:")
    print(f"   vatRate: {item.get('vatRate')} (expected: 18)")
    print(f"   kdv: {item.get('kdv')} (expected: 18)")
    print(f"   priceIncludesKdv: {item.get('priceIncludesKdv')} (expected: True)")
    print(f"   costIncludesKdv: {item.get('costIncludesKdv')} (expected: False)")
    
    # Verify
    if item.get('vatRate') == 18 or item.get('kdv') == 18:
        print("   ✅ VAT rate saved correctly")
    else:
        print(f"   ❌ VAT rate NOT saved! Got vatRate: {item.get('vatRate')}, kdv: {item.get('kdv')}")
    
    if item.get('priceIncludesKdv') == True:
        print("   ✅ priceIncludesKdv saved correctly")
    else:
        print(f"   ❌ priceIncludesKdv NOT saved! Got: {item.get('priceIncludesKdv')}")
    
    if item.get('costIncludesKdv') == False:
        print("   ✅ costIncludesKdv saved correctly")
    else:
        print(f"   ❌ costIncludesKdv NOT saved! Got: {item.get('costIncludesKdv')}")
    
    return inventory_id

def test_device_assignment(token, party_id, inventory_id):
    """Test 2: Device assignment"""
    print("\n" + "="*60)
    print("TEST 2: Device Assignment")
    print("="*60)
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Idempotency-Key": f"device-assign-{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
    }
    
    # Create device assignment
    assignment_data = {
        "deviceAssignments": [
            {
                "inventoryId": inventory_id,
                "ear": "right",
                "basePrice": 10000.00,
                "discountType": "percentage",
                "discountValue": 10,
                "sgkScheme": "standard"
            }
        ],
        "sgkScheme": "standard",
        "paymentPlan": "cash"
    }
    
    print(f"\n📤 Assigning device to party: {party_id}")
    print(f"   Inventory ID: {inventory_id}")
    
    response = requests.post(
        f"{BASE_URL}/parties/{party_id}/device-assignments",
        json=assignment_data,
        headers=headers
    )
    
    print(f"\n📥 Response: {response.status_code}")
    
    if response.status_code != 200:
        print("❌ Device assignment failed!")
        print(f"Response: {response.text}")
        return False
    
    data = response.json()
    sale_id = data.get("data", {}).get("saleId")
    assignment_ids = data.get("data", {}).get("assignmentIds", [])
    
    print("✅ Device assigned successfully!")
    print(f"   Sale ID: {sale_id}")
    print(f"   Assignment IDs: {assignment_ids}")
    
    return True

def main():
    print("🧪 Testing KDV Fields and Device Assignment")
    print("="*60)
    
    # Step 1: Login as super admin
    result = login_as_super_admin()
    if not result:
        return
    
    token, user_id = result
    
    # Step 2: Impersonate tenant
    tenant_id = "95625589-a4ad-41ff-a99e-4955943bb421"
    token = impersonate_tenant(token, tenant_id)
    if not token:
        return
    
    # Step 3: Test KDV inventory creation
    inventory_id = test_kdv_inventory_creation(token)
    if not inventory_id:
        print("\n❌ KDV test failed, skipping device assignment test")
        return
    
    # Step 4: Test device assignment
    party_id = "pat_01464a2b"  # From console log
    success = test_device_assignment(token, party_id, inventory_id)
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"✅ KDV inventory creation: {'PASSED' if inventory_id else 'FAILED'}")
    print(f"{'✅' if success else '❌'} Device assignment: {'PASSED' if success else 'FAILED'}")

if __name__ == "__main__":
    main()
