#!/usr/bin/env python3
import requests
import subprocess
import uuid

# Get token
token = subprocess.check_output(['venv/bin/python', 'gen_token_deneme.py'], 
                                stderr=subprocess.DEVNULL).decode().strip()

headers = {
    'Authorization': f'Bearer {token}',
    'Idempotency-Key': str(uuid.uuid4())
}
base_url = 'http://localhost:5003/api'

ASSIGNMENT_ID = 'assign_8e0edd6d'
SALE_ID = '2602280104'
PARTY_ID = 'pat_01464a2b'

print("=" * 60)
print("TEST: Device Change via PATCH /device-assignments")
print("=" * 60)
print()

# Current values
print("BEFORE CHANGE:")
resp = requests.get(f'{base_url}/device-assignments/{ASSIGNMENT_ID}', headers=headers)
data = resp.json().get('data', {})
print(f"  List Price: {data.get('listPrice')}")
print(f"  SGK Support: {data.get('sgkSupport')}")
print(f"  Net Payable: {data.get('netPayable')}")
print()

# Change device
print("Changing device (new list price: 15000, SGK: 5000)...")
headers['Idempotency-Key'] = str(uuid.uuid4())
patch_data = {
    'listPrice': 15000,
    'sgkSupport': 5000,
    'netPayable': 10000
}
resp = requests.patch(f'{base_url}/device-assignments/{ASSIGNMENT_ID}', 
                      headers=headers, json=patch_data)
if resp.status_code != 200:
    print(f"ERROR: {resp.status_code} - {resp.text}")
    exit(1)
print("✅ Device changed")
print()

# Check all 3 endpoints
print("AFTER CHANGE - Checking all endpoints:")
print()

print("1️⃣ Device Card:")
resp = requests.get(f'{base_url}/parties/{PARTY_ID}/devices', headers=headers)
for item in resp.json().get('data', []):
    if item.get('id') == ASSIGNMENT_ID:
        print(f"  List Price: {item.get('listPrice')} (should be 15000)")
        print(f"  SGK Support: {item.get('sgkSupport')}")
        print(f"  Net Payable: {item.get('netPayable')} (should be 10000)")
print()

print("2️⃣ Sale Detail:")
resp = requests.get(f'{base_url}/sales/{SALE_ID}', headers=headers)
data = resp.json().get('data', {})
print(f"  Total Amount: {data.get('totalAmount')} (should be 30000 = 15000*2)")
print(f"  SGK Coverage: {data.get('sgkCoverage')}")
print(f"  Final Amount: {data.get('finalAmount')} (should be 20000 = 10000*2)")
print(f"  Paid Amount: {data.get('paidAmount')}")
print()

print("3️⃣ Sales History:")
resp = requests.get(f'{base_url}/parties/{PARTY_ID}/sales', headers=headers)
data = resp.json().get('data', [])
if isinstance(data, dict):
    items = data.get('items', [])
else:
    items = data
for item in items:
    if item.get('id') == SALE_ID:
        print(f"  Total Amount: {item.get('totalAmount')} (should be 30000)")
        print(f"  SGK Coverage: {item.get('sgkCoverage')}")
        print(f"  Final Amount: {item.get('finalAmount')} (should be 20000)")
        print(f"  Paid Amount: {item.get('paidAmount')}")
print()

print("=" * 60)
print("CHECK: All 3 endpoints should show SAME updated values!")
print("=" * 60)
