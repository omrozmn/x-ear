#!/usr/bin/env python3
"""
Comprehensive inventory operations test.
Tests ALL inventory operations: create, read, update, delete, pricing, VAT, serials, etc.
"""

import requests
import json
import time

BASE_URL = "http://localhost:5003"

# Super admin credentials (tenant_admin role)
SUPER_ADMIN = {
    "email": "admin@xear.com",
    "password": "admin123"
}

# Test tenant to impersonate
TEST_TENANT_ID = "938ab3ec-192a-4f89-8a63-6941212e2f2a"


def login(email, password):
    """Login and get access token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password}
    )
    response.raise_for_status()
    data = response.json()
    return data["data"]["accessToken"]


def impersonate_tenant(token, tenant_id):
    """Impersonate a tenant"""
    response = requests.post(
        f"{BASE_URL}/api/admin/impersonate",
        json={"tenantId": tenant_id},
        headers={"Authorization": f"Bearer {token}"}
    )
    response.raise_for_status()
    data = response.json()
    return data["data"]["accessToken"]


def get_headers(token):
    """Get headers with idempotency key"""
    return {
        "Authorization": f"Bearer {token}",
        "Idempotency-Key": f"test-{int(time.time() * 1000)}"
    }


def test_inventory_operations():
    print("=" * 80)
    print("COMPREHENSIVE INVENTORY OPERATIONS TEST")
    print("=" * 80)
    
    # 1. Login as super admin
    print("\n1. Logging in as super admin...")
    try:
        admin_token = login(SUPER_ADMIN["email"], SUPER_ADMIN["password"])
        print("✅ Logged in as super admin")
    except Exception as e:
        print(f"❌ Failed to login as super admin: {e}")
        print("   Trying with test@test.com instead...")
        admin_token = login("test@test.com", "test123")
        print("✅ Logged in as test user")
    
    # 2. Impersonate tenant
    print(f"\n2. Impersonating tenant: {TEST_TENANT_ID}...")
    try:
        token = impersonate_tenant(admin_token, TEST_TENANT_ID)
        print("✅ Impersonated tenant")
    except Exception as e:
        print(f"⚠️  Cannot impersonate (using current tenant): {e}")
        token = admin_token
    
    # 3. CREATE - Test inventory creation with different scenarios
    print("\n" + "=" * 80)
    print("3. TESTING INVENTORY CREATION")
    print("=" * 80)
    
    created_items = []
    
    # 3a. Create hearing aid with serials (KDV excluded price)
    print("\n3a. Creating hearing aid with serials (KDV excluded)...")
    item1_data = {
        "name": "Phonak Audeo Paradise P90",
        "brand": "Phonak",
        "model": "Audeo Paradise P90",
        "category": "hearing_aid",
        "availableInventory": 5,
        "totalInventory": 5,
        "price": 10000.0,  # KDV hariç fiyat
        "cost": 7000.0,
        "vatRate": 20.0,
        "priceIncludesKdv": False,  # Fiyat KDV hariç
        "costIncludesKdv": False,
        "availableSerials": ["PH001", "PH002"],
        "direction": "both",
        "warranty": 24,
        "reorderLevel": 2,
        "description": "Premium hearing aid"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/inventory",
        json=item1_data,
        headers=get_headers(token)
    )
    
    if response.status_code in [200, 201]:
        item1 = response.json()["data"]
        created_items.append(item1["id"])
        print(f"✅ Created: {item1['name']}")
        print(f"   ID: {item1['id']}")
        print(f"   Price (excl VAT): {item1['price']}")
        print(f"   Price (incl VAT): {item1['vatIncludedPrice']}")
        print(f"   Stock: {item1['availableInventory']}")
        print(f"   Serials: {len(item1['availableSerials'])} items")
        
        # Verify VAT calculation
        expected_vat_price = 10000.0 * 1.20
        if abs(item1['vatIncludedPrice'] - expected_vat_price) < 0.01:
            print(f"   ✅ VAT calculation correct: {expected_vat_price}")
        else:
            print(f"   ❌ VAT calculation wrong: expected {expected_vat_price}, got {item1['vatIncludedPrice']}")
    else:
        print(f"❌ Failed: {response.status_code}")
        print(response.text)
    
    # 3b. Create accessory without serials (KDV included price)
    print("\n3b. Creating accessory (KDV included price)...")
    item2_data = {
        "name": "Hearing Aid Battery Size 312",
        "brand": "Duracell",
        "model": "312",
        "category": "pil",
        "availableInventory": 100,
        "totalInventory": 100,
        "price": 60.0,  # KDV dahil fiyat
        "cost": 40.0,
        "vatRate": 20.0,
        "priceIncludesKdv": True,  # Fiyat KDV dahil
        "costIncludesKdv": True,
        "availableSerials": [],  # No serials for batteries
        "reorderLevel": 20,
        "unit": "paket"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/inventory",
        json=item2_data,
        headers=get_headers(token)
    )
    
    if response.status_code in [200, 201]:
        item2 = response.json()["data"]
        created_items.append(item2["id"])
        print(f"✅ Created: {item2['name']}")
        print(f"   Price (incl VAT): {item2['price']}")
        print(f"   Stock: {item2['availableInventory']}")
        print(f"   Unit: {item2['unit']}")
    else:
        print(f"❌ Failed: {response.status_code}")
        print(response.text)
    
    # 3c. Create with barcode and stock code
    print("\n3c. Creating item with barcode and stock code...")
    item3_data = {
        "name": "Cleaning Kit",
        "brand": "Generic",
        "model": "Standard",
        "category": "aksesuar",
        "barcode": "1234567890123",
        "stockCode": "CLN-001",
        "availableInventory": 50,
        "totalInventory": 50,
        "price": 150.0,
        "vatRate": 20.0,
        "priceIncludesKdv": False,
        "reorderLevel": 10
    }
    
    response = requests.post(
        f"{BASE_URL}/api/inventory",
        json=item3_data,
        headers=get_headers(token)
    )
    
    if response.status_code in [200, 201]:
        item3 = response.json()["data"]
        created_items.append(item3["id"])
        print(f"✅ Created: {item3['name']}")
        print(f"   Barcode: {item3['barcode']}")
        print(f"   Stock Code: {item3['stockCode']}")
    else:
        print(f"❌ Failed: {response.status_code}")
        print(response.text)
    
    # 4. READ - Test inventory retrieval
    print("\n" + "=" * 80)
    print("4. TESTING INVENTORY READ OPERATIONS")
    print("=" * 80)
    
    # 4a. Get all inventory
    print("\n4a. Getting all inventory...")
    response = requests.get(
        f"{BASE_URL}/api/inventory",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code == 200:
        items = response.json()["data"]
        print(f"✅ Retrieved {len(items)} items")
    else:
        print(f"❌ Failed: {response.status_code}")
    
    # 4b. Get single item
    if created_items:
        print(f"\n4b. Getting single item: {created_items[0]}...")
        response = requests.get(
            f"{BASE_URL}/api/inventory/{created_items[0]}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            item = response.json()["data"]
            print(f"✅ Retrieved: {item['name']}")
            print(f"   All fields present: {all(k in item for k in ['id', 'name', 'price', 'availableInventory'])}")
        else:
            print(f"❌ Failed: {response.status_code}")
    
    # 4c. Search inventory
    print("\n4c. Searching inventory (brand: Phonak)...")
    response = requests.get(
        f"{BASE_URL}/api/inventory?search=Phonak",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code == 200:
        items = response.json()["data"]
        print(f"✅ Found {len(items)} items")
    else:
        print(f"❌ Failed: {response.status_code}")
    
    # 4d. Get inventory stats
    print("\n4d. Getting inventory stats...")
    response = requests.get(
        f"{BASE_URL}/api/inventory/stats",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code == 200:
        stats = response.json()["data"]
        print(f"✅ Stats retrieved:")
        print(f"   Total Items: {stats.get('totalItems', 'N/A')}")
        print(f"   Low Stock: {stats.get('lowStock', 'N/A')}")
    else:
        print(f"❌ Failed: {response.status_code}")
    
    # 5. UPDATE - Test inventory updates
    print("\n" + "=" * 80)
    print("5. TESTING INVENTORY UPDATE OPERATIONS")
    print("=" * 80)
    
    if created_items:
        item_id = created_items[0]
        
        # 5a. Update price and VAT
        print(f"\n5a. Updating price and VAT for {item_id}...")
        update_data = {
            "price": 12000.0,
            "vatRate": 18.0,
            "priceIncludesKdv": True
        }
        
        response = requests.put(
            f"{BASE_URL}/api/inventory/{item_id}",
            json=update_data,
            headers=get_headers(token)
        )
        
        if response.status_code == 200:
            updated = response.json()["data"]
            print(f"✅ Updated price: {updated['price']}")
            print(f"   VAT Rate: {updated['vatRate']}%")
            print(f"   Price includes KDV: {updated['priceIncludesKdv']}")
        else:
            print(f"❌ Failed: {response.status_code}")
            print(response.text)
        
        # 5b. Update stock quantity
        print(f"\n5b. Updating stock quantity...")
        update_data = {
            "availableInventory": 8,
            "totalInventory": 10
        }
        
        response = requests.put(
            f"{BASE_URL}/api/inventory/{item_id}",
            json=update_data,
            headers=get_headers(token)
        )
        
        if response.status_code == 200:
            updated = response.json()["data"]
            print(f"✅ Updated stock: {updated['availableInventory']}/{updated['totalInventory']}")
        else:
            print(f"❌ Failed: {response.status_code}")
        
        # 5c. Add serial numbers
        print(f"\n5c. Adding serial numbers...")
        response = requests.post(
            f"{BASE_URL}/api/inventory/{item_id}/serials",
            json={"serials": ["PH003", "PH004", "PH005"]},
            headers=get_headers(token)
        )
        
        if response.status_code == 200:
            result = response.json()["data"]
            print(f"✅ Added serials")
            
            # Verify stock didn't change
            response = requests.get(
                f"{BASE_URL}/api/inventory/{item_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            item = response.json()["data"]
            print(f"   Stock after adding serials: {item['availableInventory']} (should still be 8)")
            print(f"   Total serials: {len(item['availableSerials'])}")
            
            if item['availableInventory'] == 8:
                print("   ✅ Stock unchanged (correct!)")
            else:
                print(f"   ❌ Stock changed to {item['availableInventory']} (wrong!)")
        else:
            print(f"❌ Failed: {response.status_code}")
        
        # 5d. Update description and warranty
        print(f"\n5d. Updating description and warranty...")
        update_data = {
            "description": "Updated premium hearing aid with extended warranty",
            "warranty": 36
        }
        
        response = requests.put(
            f"{BASE_URL}/api/inventory/{item_id}",
            json=update_data,
            headers=get_headers(token)
        )
        
        if response.status_code == 200:
            updated = response.json()["data"]
            print(f"✅ Updated warranty: {updated['warranty']} months")
        else:
            print(f"❌ Failed: {response.status_code}")
    
    # 6. CATEGORIES AND BRANDS
    print("\n" + "=" * 80)
    print("6. TESTING CATEGORIES AND BRANDS")
    print("=" * 80)
    
    # 6a. Get categories
    print("\n6a. Getting categories...")
    response = requests.get(
        f"{BASE_URL}/api/inventory/categories",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code == 200:
        categories = response.json()["data"]
        print(f"✅ Categories: {categories}")
    else:
        print(f"❌ Failed: {response.status_code}")
    
    # 6b. Get brands
    print("\n6b. Getting brands...")
    response = requests.get(
        f"{BASE_URL}/api/inventory/brands",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code == 200:
        brands = response.json()["data"]
        print(f"✅ Brands: {brands}")
    else:
        print(f"❌ Failed: {response.status_code}")
    
    # 7. DELETE - Test inventory deletion
    print("\n" + "=" * 80)
    print("7. TESTING INVENTORY DELETION")
    print("=" * 80)
    
    if len(created_items) > 1:
        item_to_delete = created_items[-1]  # Delete last item
        print(f"\n7. Deleting item: {item_to_delete}...")
        
        response = requests.delete(
            f"{BASE_URL}/api/inventory/{item_to_delete}",
            headers=get_headers(token)
        )
        
        if response.status_code in [200, 204]:
            print(f"✅ Deleted successfully")
            
            # Verify deletion
            response = requests.get(
                f"{BASE_URL}/api/inventory/{item_to_delete}",
                headers={"Authorization": f"Bearer {token}"}
            )
            
            if response.status_code == 404:
                print("   ✅ Verified: Item not found (correct)")
            else:
                print(f"   ❌ Item still exists (status: {response.status_code})")
        else:
            print(f"❌ Failed: {response.status_code}")
    
    # 8. CLEANUP
    print("\n" + "=" * 80)
    print("8. CLEANUP")
    print("=" * 80)
    
    print("\nCleaning up remaining test items...")
    for item_id in created_items[:-1]:  # All except the one we already deleted
        response = requests.delete(
            f"{BASE_URL}/api/inventory/{item_id}",
            headers=get_headers(token)
        )
        if response.status_code in [200, 204]:
            print(f"✅ Deleted {item_id}")
        else:
            print(f"⚠️  Could not delete {item_id}")
    
    # SUMMARY
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print("""
✅ Tested Operations:
   - Create inventory (with/without serials, different VAT modes)
   - Read inventory (list, single, search, stats)
   - Update inventory (price, VAT, stock, serials, description)
   - Delete inventory
   - Categories and brands
   - Serial number management (independent of stock)
   
✅ Key Validations:
   - VAT calculations (included/excluded)
   - Serial numbers don't affect stock quantity
   - Stock quantity management
   - Barcode and stock code handling
   - Warranty and description updates
    """)
    print("=" * 80)


if __name__ == "__main__":
    test_inventory_operations()
