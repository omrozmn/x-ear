#!/usr/bin/env python3
"""
Test to verify inventory serial number fix.
Serial numbers should NOT affect inventory quantities.
"""

import requests

BASE_URL = "http://localhost:5003"

def login():
    """Login and get access token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "test@test.com", "password": "test123"}
    )
    response.raise_for_status()
    data = response.json()
    return data["data"]["accessToken"]


def test_inventory_serial_logic():
    print("=" * 80)
    print("INVENTORY SERIAL NUMBER FIX TEST")
    print("=" * 80)
    
    # Login
    print("\n1. Logging in...")
    token = login()
    headers = {
        "Authorization": f"Bearer {token}",
        "Idempotency-Key": f"test-{int(__import__('time').time())}"
    }
    print("✅ Logged in")
    
    # Create inventory with 10 items but only 3 serial numbers
    print("\n2. Creating inventory: 10 items, 3 serial numbers...")
    inventory_data = {
        "name": "Test Hearing Aid",
        "brand": "Test Brand",
        "model": "Model X",
        "category": "hearing_aid",
        "availableInventory": 10,
        "totalInventory": 10,
        "price": 5000.0,
        "kdv": 20.0,
        "availableSerials": ["SN001", "SN002", "SN003"]
    }
    
    response = requests.post(
        f"{BASE_URL}/api/inventory",
        json=inventory_data,
        headers=headers
    )
    
    if response.status_code not in [200, 201]:
        print(f"❌ Failed to create inventory: {response.status_code}")
        print(response.text)
        return
    
    result = response.json()
    item_id = result["data"]["id"]
    print(f"✅ Created inventory item: {item_id}")
    
    # Verify quantities
    print("\n3. Verifying inventory quantities...")
    response = requests.get(
        f"{BASE_URL}/api/inventory/{item_id}",
        headers=headers
    )
    response.raise_for_status()
    item = response.json()["data"]
    
    print(f"   Available Inventory: {item['availableInventory']}")
    print(f"   Total Inventory: {item['totalInventory']}")
    print(f"   Serial Numbers: {len(item['availableSerials'])} items")
    print(f"   Serials: {item['availableSerials']}")
    
    # Check if quantities are correct
    if item['availableInventory'] == 10 and item['totalInventory'] == 10:
        print("✅ CORRECT: Inventory quantity is 10 (not affected by 3 serial numbers)")
    else:
        print(f"❌ WRONG: Inventory should be 10, but got {item['availableInventory']}")
        print("   This means serial numbers are still affecting inventory quantities!")
    
    # Add more serial numbers
    print("\n4. Adding 2 more serial numbers...")
    headers["Idempotency-Key"] = f"test-add-{int(__import__('time').time())}"
    response = requests.post(
        f"{BASE_URL}/api/inventory/{item_id}/serials",
        json={"serials": ["SN004", "SN005"]},
        headers=headers
    )
    
    if response.status_code == 200:
        print("✅ Added serial numbers")
        
        # Verify quantities didn't change
        response = requests.get(
            f"{BASE_URL}/api/inventory/{item_id}",
            headers=headers
        )
        response.raise_for_status()
        item = response.json()["data"]
        
        print(f"   Available Inventory: {item['availableInventory']}")
        print(f"   Serial Numbers: {len(item['availableSerials'])} items")
        
        if item['availableInventory'] == 10:
            print("✅ CORRECT: Inventory still 10 after adding serials")
        else:
            print(f"❌ WRONG: Inventory changed to {item['availableInventory']}")
    else:
        print(f"⚠️  Could not add serials: {response.status_code}")
    
    # Cleanup
    print("\n5. Cleaning up...")
    requests.delete(f"{BASE_URL}/api/inventory/{item_id}", headers=headers)
    print("✅ Test completed")
    
    print("\n" + "=" * 80)
    print("SUMMARY:")
    print("- Inventory quantity should be independent of serial numbers")
    print("- User can add 10 items with 0, 3, or 10 serial numbers")
    print("- Serial numbers are for tracking only, not quantity management")
    print("=" * 80)


if __name__ == "__main__":
    test_inventory_serial_logic()
