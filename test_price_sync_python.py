#!/usr/bin/env python3
"""Test price sync when unitListPrice changes"""

import requests
from datetime import datetime, timedelta
from jose import jwt

BASE_URL = "http://localhost:5003"

# Generate token (same as gen_token_deneme.py)
SECRET_KEY = "super-secret-jwt-key-for-development"
ALGORITHM = "HS256"

def create_access_token(identity: str, tenant_id: str):
    expire = datetime.utcnow() + timedelta(hours=8)
    to_encode = {
        "sub": identity,
        "exp": expire,
        "iat": datetime.utcnow(),
        "access.tenant_id": tenant_id,
        "role": "admin",
        "tenant_id": tenant_id
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

token = create_access_token("usr_eafaadc6", "95625589-a4ad-41ff-a99e-4955943bb421")

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

print("🔬 PRICE SYNC TEST")
print("=" * 60)

# Test data
PARTY_ID = "pat_01464a2b"
PRODUCT_ID = "item_27022026112808_947d3a"

print("\nTest Data:")
print(f"  Party: {PARTY_ID}")
print(f"  Product: {PRODUCT_ID}")

# Step 1: Create bilateral sale
print("\n📋 STEP 1: CREATE BILATERAL SALE (unitListPrice: 10000)")
print("=" * 60)

create_headers = headers.copy()
create_headers["Idempotency-Key"] = f"test-{datetime.now().timestamp()}"

create_response = requests.post(
    f"{BASE_URL}/api/sales",
    headers=create_headers,
    json={
        "partyId": PARTY_ID,
        "productId": PRODUCT_ID,
        "earSelection": "bilateral",
        "unitListPrice": 10000.0,
        "sgkScheme": "over18_working",
        "paymentMethod": "cash",
        "paidAmount": 1000.0
    }
)

if not create_response.ok:
    print(f"❌ Failed to create sale: {create_response.status_code}")
    print(create_response.text)
    exit(1)

sale_data = create_response.json()
if not sale_data.get("success"):
    print(f"❌ Sale creation failed: {sale_data.get('error')}")
    exit(1)

sale_id = sale_data["data"]["id"]
print(f"✅ Created sale: {sale_id}")

# Get initial device prices
get_response = requests.get(
    f"{BASE_URL}/api/sales/{sale_id}",
    headers=headers
)

sale_full = get_response.json()["data"]
device1 = sale_full["devices"][0]
device2 = sale_full["devices"][1]

print("\nInitial device prices:")
print(f"  Device 1 ({device1['id']}): {device1['listPrice']}")
print(f"  Device 2 ({device2['id']}): {device2['listPrice']}")

# Step 2: Update sale with new price
print("\n📋 STEP 2: UPDATE SALE (unitListPrice: 12000)")
print("=" * 60)

update_headers = headers.copy()
update_headers["Idempotency-Key"] = f"test-{datetime.now().timestamp()}"

update_response = requests.put(
    f"{BASE_URL}/api/sales/{sale_id}",
    headers=update_headers,
    json={
        "unitListPrice": 12000.0,
        "sgkScheme": "over18_working",
        "paymentMethod": "cash",
        "paidAmount": 1000.0,
        "earSelection": "bilateral"
    }
)

if not update_response.ok:
    print(f"❌ Failed to update sale: {update_response.status_code}")
    print(update_response.text)
    exit(1)

print("✅ Updated unitListPrice to 12000")

# Step 3: Verify device prices synced
print("\n📋 STEP 3: VERIFY DEVICE PRICES SYNCED")
print("=" * 60)

# Get updated sale
get_response = requests.get(
    f"{BASE_URL}/api/sales/{sale_id}",
    headers=headers
)

sale_full = get_response.json()["data"]
new_device1 = sale_full["devices"][0]
new_device2 = sale_full["devices"][1]

print("\nAfter update (from sale endpoint):")
print(f"  Device 1: {new_device1['listPrice']} (expected: 12000.0)")
print(f"  Device 2: {new_device2['listPrice']} (expected: 12000.0)")

# Verify via device assignment endpoint
device1_response = requests.get(
    f"{BASE_URL}/api/device-assignments/{device1['id']}",
    headers=headers
)
device2_response = requests.get(
    f"{BASE_URL}/api/device-assignments/{device2['id']}",
    headers=headers
)

device1_direct = device1_response.json()["data"]["listPrice"]
device2_direct = device2_response.json()["data"]["listPrice"]

print("\nAfter update (from device assignment endpoint):")
print(f"  Device 1: {device1_direct} (expected: 12000.0)")
print(f"  Device 2: {device2_direct} (expected: 12000.0)")

# Check results
print("\n" + "=" * 60)
if (new_device1['listPrice'] == 12000.0 and 
    new_device2['listPrice'] == 12000.0 and
    device1_direct == 12000.0 and 
    device2_direct == 12000.0):
    print("✅ PRICE SYNC TEST PASSED")
    print("All device assignments updated correctly!")
else:
    print("❌ PRICE SYNC TEST FAILED")
    print("Device assignments did NOT sync with new unitListPrice")
    print("\nExpected: 12000.0 for all devices")
    print("Got:")
    print(f"  - Sale endpoint device 1: {new_device1['listPrice']}")
    print(f"  - Sale endpoint device 2: {new_device2['listPrice']}")
    print(f"  - Direct endpoint device 1: {device1_direct}")
    print(f"  - Direct endpoint device 2: {device2_direct}")

print(f"\nTest Sale ID: {sale_id}")
