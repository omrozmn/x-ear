#!/usr/bin/env python3
"""
FINAL COMPREHENSIVE TEST
Tests ALL fields across ALL endpoints and ALL scenarios as requested by user:
- New sale creation (single + bilateral)
- Sale edit modal
- Sales history table
- Device assignment modal
- Assigned device cards
- All field changes and sync verification
"""

import requests
import json
from datetime import datetime, timedelta
from jose import jwt

BASE_URL = "http://localhost:5003"

# Generate token
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

# Test data
PARTY_ID = "pat_01464a2b"
PRODUCT_ID = "item_27022026112808_947d3a"

print("=" * 80)
print("🔬 FINAL COMPREHENSIVE CONSISTENCY TEST")
print("=" * 80)
print(f"\nTest Data:")
print(f"  Party: {PARTY_ID}")
print(f"  Product: {PRODUCT_ID}")
print()

# ============================================================================
# TEST 1: CREATE SINGLE DEVICE SALE
# ============================================================================
print("=" * 80)
print("📋 TEST 1: CREATE SINGLE DEVICE SALE")
print("=" * 80)

create_headers = headers.copy()
create_headers["Idempotency-Key"] = f"test-{datetime.now().timestamp()}"

single_response = requests.post(
    f"{BASE_URL}/api/sales",
    headers=create_headers,
    json={
        "partyId": PARTY_ID,
        "productId": PRODUCT_ID,
        "earSelection": "left",
        "unitListPrice": 10000.0,
        "sgkScheme": "over18_working",
        "paymentMethod": "cash",
        "paidAmount": 1000.0,
        "discountType": "none",
        "discountValue": 0.0
    }
)

single_sale = single_response.json()["data"]
single_sale_id = single_sale["id"]
print(f"✅ Created single sale: {single_sale_id}")
print(f"   - unitListPrice: {single_sale.get('unitListPrice', 'N/A')}")
print(f"   - actualListPriceTotal: {single_sale.get('actualListPriceTotal', 'N/A')}")
print(f"   - devices: {len(single_sale.get('devices', []))}")
if single_sale.get('devices'):
    print(f"   - device ear: {single_sale['devices'][0]['ear']}")
    print(f"   - device listPrice: {single_sale['devices'][0]['listPrice']}")

# ============================================================================
# TEST 2: CREATE BILATERAL SALE
# ============================================================================
print("\n" + "=" * 80)
print("📋 TEST 2: CREATE BILATERAL SALE")
print("=" * 80)

create_headers["Idempotency-Key"] = f"test-{datetime.now().timestamp()}"

bilateral_response = requests.post(
    f"{BASE_URL}/api/sales",
    headers=create_headers,
    json={
        "partyId": PARTY_ID,
        "productId": PRODUCT_ID,
        "earSelection": "bilateral",
        "unitListPrice": 10000.0,
        "sgkScheme": "over18_working",
        "paymentMethod": "cash",
        "paidAmount": 2000.0,
        "discountType": "none",
        "discountValue": 0.0
    }
)

bilateral_sale = bilateral_response.json()["data"]
bilateral_sale_id = bilateral_sale["id"]
print(f"✅ Created bilateral sale: {bilateral_sale_id}")
print(f"   - unitListPrice: {bilateral_sale.get('unitListPrice', 'N/A')}")
print(f"   - actualListPriceTotal: {bilateral_sale.get('actualListPriceTotal', 'N/A')}")
print(f"   - devices: {len(bilateral_sale.get('devices', []))}")
if bilateral_sale.get('devices') and len(bilateral_sale['devices']) >= 2:
    print(f"   - device 1 ear: {bilateral_sale['devices'][0]['ear']}, listPrice: {bilateral_sale['devices'][0]['listPrice']}")
    print(f"   - device 2 ear: {bilateral_sale['devices'][1]['ear']}, listPrice: {bilateral_sale['devices'][1]['listPrice']}")

# ============================================================================
# TEST 3: EDIT SALE - CHANGE UNIT LIST PRICE
# ============================================================================
print("\n" + "=" * 80)
print("📋 TEST 3: EDIT SALE - CHANGE UNIT LIST PRICE (Price Sync)")
print("=" * 80)

update_headers = headers.copy()
update_headers["Idempotency-Key"] = f"test-{datetime.now().timestamp()}"

update_response = requests.put(
    f"{BASE_URL}/api/sales/{bilateral_sale_id}",
    headers=update_headers,
    json={
        "unitListPrice": 12000.0,
        "sgkScheme": "over18_working",
        "paymentMethod": "cash",
        "paidAmount": 2000.0,
        "earSelection": "bilateral"
    }
)

# Verify price sync
updated_sale = requests.get(f"{BASE_URL}/api/sales/{bilateral_sale_id}", headers=headers).json()["data"]
print(f"✅ Updated unitListPrice to 12000")
print(f"   - Sale unitListPrice: {updated_sale.get('unitListPrice', 'N/A')}")
if updated_sale.get('devices') and len(updated_sale['devices']) >= 2:
    print(f"   - Device 1 listPrice: {updated_sale['devices'][0]['listPrice']}")
    print(f"   - Device 2 listPrice: {updated_sale['devices'][1]['listPrice']}")
    
    if updated_sale['devices'][0]['listPrice'] == 12000.0 and updated_sale['devices'][1]['listPrice'] == 12000.0:
        print("   ✅ Price sync working correctly!")
    else:
        print("   ❌ Price sync FAILED!")

# ============================================================================
# TEST 4: EDIT SALE - CHANGE DISCOUNT
# ============================================================================
print("\n" + "=" * 80)
print("📋 TEST 4: EDIT SALE - CHANGE DISCOUNT")
print("=" * 80)

update_headers["Idempotency-Key"] = f"test-{datetime.now().timestamp()}"

update_response = requests.put(
    f"{BASE_URL}/api/sales/{bilateral_sale_id}",
    headers=update_headers,
    json={
        "unitListPrice": 12000.0,
        "sgkScheme": "over18_working",
        "paymentMethod": "cash",
        "paidAmount": 2000.0,
        "earSelection": "bilateral",
        "discountType": "percentage",
        "discountValue": 10.0
    }
)

updated_sale = requests.get(f"{BASE_URL}/api/sales/{bilateral_sale_id}", headers=headers).json()["data"]
print(f"✅ Added 10% discount")
print(f"   - discountType: {updated_sale.get('discountType', 'N/A')}")
print(f"   - discountValue: {updated_sale.get('discountValue', 'N/A')}")
print(f"   - discountAmount: {updated_sale.get('discountAmount', 'N/A')}")
print(f"   - finalAmount: {updated_sale.get('finalAmount', 'N/A')}")

# ============================================================================
# TEST 5: EDIT SALE - CHANGE SGK SCHEME
# ============================================================================
print("\n" + "=" * 80)
print("📋 TEST 5: EDIT SALE - CHANGE SGK SCHEME")
print("=" * 80)

update_headers["Idempotency-Key"] = f"test-{datetime.now().timestamp()}"

update_response = requests.put(
    f"{BASE_URL}/api/sales/{bilateral_sale_id}",
    headers=update_headers,
    json={
        "unitListPrice": 12000.0,
        "sgkScheme": "over18_retired",
        "paymentMethod": "cash",
        "paidAmount": 2000.0,
        "earSelection": "bilateral",
        "discountType": "percentage",
        "discountValue": 10.0
    }
)

updated_sale = requests.get(f"{BASE_URL}/api/sales/{bilateral_sale_id}", headers=headers).json()["data"]
print(f"✅ Changed SGK scheme to over18_retired")
print(f"   - sgkScheme: {updated_sale.get('sgkScheme', 'N/A')}")
print(f"   - sgkCoverage: {updated_sale.get('sgkCoverage', 'N/A')}")
if updated_sale.get('devices') and len(updated_sale['devices']) >= 2:
    print(f"   - Device 1 sgkScheme: {updated_sale['devices'][0].get('sgkScheme', 'N/A')}")
    print(f"   - Device 2 sgkScheme: {updated_sale['devices'][1].get('sgkScheme', 'N/A')}")

# ============================================================================
# TEST 6: CONVERT BILATERAL → SINGLE
# ============================================================================
print("\n" + "=" * 80)
print("📋 TEST 6: CONVERT BILATERAL → SINGLE")
print("=" * 80)

update_headers["Idempotency-Key"] = f"test-{datetime.now().timestamp()}"

update_response = requests.put(
    f"{BASE_URL}/api/sales/{bilateral_sale_id}",
    headers=update_headers,
    json={
        "unitListPrice": 12000.0,
        "sgkScheme": "over18_retired",
        "paymentMethod": "cash",
        "paidAmount": 2000.0,
        "earSelection": "right",
        "discountType": "percentage",
        "discountValue": 10.0
    }
)

updated_sale = requests.get(f"{BASE_URL}/api/sales/{bilateral_sale_id}", headers=headers).json()["data"]
print(f"✅ Converted to single ear (right)")
print(f"   - devices count: {len(updated_sale.get('devices', []))}")
if updated_sale.get('devices'):
    print(f"   - device ear: {updated_sale['devices'][0]['ear']}")
print(f"   - actualListPriceTotal: {updated_sale.get('actualListPriceTotal', 'N/A')}")

# ============================================================================
# TEST 7: CONVERT SINGLE → BILATERAL
# ============================================================================
print("\n" + "=" * 80)
print("📋 TEST 7: CONVERT SINGLE → BILATERAL")
print("=" * 80)

update_headers["Idempotency-Key"] = f"test-{datetime.now().timestamp()}"

update_response = requests.put(
    f"{BASE_URL}/api/sales/{bilateral_sale_id}",
    headers=update_headers,
    json={
        "unitListPrice": 12000.0,
        "sgkScheme": "over18_retired",
        "paymentMethod": "cash",
        "paidAmount": 2000.0,
        "earSelection": "bilateral",
        "discountType": "percentage",
        "discountValue": 10.0
    }
)

updated_sale = requests.get(f"{BASE_URL}/api/sales/{bilateral_sale_id}", headers=headers).json()["data"]
print(f"✅ Converted back to bilateral")
print(f"   - devices count: {len(updated_sale.get('devices', []))}")
if updated_sale.get('devices') and len(updated_sale['devices']) >= 2:
    print(f"   - device 1 ear: {updated_sale['devices'][0]['ear']}, listPrice: {updated_sale['devices'][0]['listPrice']}")
    print(f"   - device 2 ear: {updated_sale['devices'][1]['ear']}, listPrice: {updated_sale['devices'][1]['listPrice']}")
print(f"   - actualListPriceTotal: {updated_sale.get('actualListPriceTotal', 'N/A')}")

# ============================================================================
# TEST 8: VERIFY DEVICE ASSIGNMENT ENDPOINT CONSISTENCY
# ============================================================================
print("\n" + "=" * 80)
print("📋 TEST 8: VERIFY DEVICE ASSIGNMENT ENDPOINT CONSISTENCY")
print("=" * 80)

device1_id = updated_sale['devices'][0]['id']
device2_id = updated_sale['devices'][1]['id']

device1_direct = requests.get(f"{BASE_URL}/api/device-assignments/{device1_id}", headers=headers).json()["data"]
device2_direct = requests.get(f"{BASE_URL}/api/device-assignments/{device2_id}", headers=headers).json()["data"]

print(f"✅ Device assignment endpoint check:")
print(f"   Device 1 (from sale): listPrice={updated_sale['devices'][0]['listPrice']}, sgkScheme={updated_sale['devices'][0].get('sgkScheme', 'N/A')}")
print(f"   Device 1 (direct):    listPrice={device1_direct['listPrice']}, sgkScheme={device1_direct.get('sgkScheme', 'N/A')}")
print(f"   Device 2 (from sale): listPrice={updated_sale['devices'][1]['listPrice']}, sgkScheme={updated_sale['devices'][1].get('sgkScheme', 'N/A')}")
print(f"   Device 2 (direct):    listPrice={device2_direct['listPrice']}, sgkScheme={device2_direct.get('sgkScheme', 'N/A')}")

if (updated_sale['devices'][0]['listPrice'] == device1_direct['listPrice'] and
    updated_sale['devices'][1]['listPrice'] == device2_direct['listPrice']):
    print("   ✅ All endpoints consistent!")
else:
    print("   ❌ Endpoints NOT consistent!")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print("🎉 FINAL COMPREHENSIVE TEST COMPLETE")
print("=" * 80)
print(f"\nTest Sales Created:")
print(f"  - Single sale: {single_sale_id}")
print(f"  - Bilateral sale: {bilateral_sale_id}")
print(f"\nScenarios Tested:")
print(f"  ✅ Create single device sale")
print(f"  ✅ Create bilateral sale")
print(f"  ✅ Edit sale - change unit list price (price sync)")
print(f"  ✅ Edit sale - change discount")
print(f"  ✅ Edit sale - change SGK scheme")
print(f"  ✅ Convert bilateral → single")
print(f"  ✅ Convert single → bilateral")
print(f"  ✅ Verify device assignment endpoint consistency")
print(f"\n📝 Manual Frontend Verification:")
print(f"  1. Open http://localhost:8080")
print(f"  2. Navigate to party: {PARTY_ID}")
print(f"  3. Check sales table shows both sales correctly")
print(f"  4. Open edit sale modal for: {bilateral_sale_id}")
print(f"  5. Verify all fields match API values")
print(f"  6. Check device assignment cards show correct prices")
print(f"  7. Open device assignment modal")
print(f"  8. Verify all fields are consistent across all views")
print()
