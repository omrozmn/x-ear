#!/usr/bin/env python3
import requests
import subprocess

# Get token
token = subprocess.check_output(['venv/bin/python', 'gen_token_deneme.py'], 
                                stderr=subprocess.DEVNULL).decode().strip()

headers = {'Authorization': f'Bearer {token}'}
base_url = 'http://localhost:5003/api'

SALE_ID = '2602280104'
PARTY_ID = 'pat_01464a2b'

print("=" * 50)
print(f"CROSS-CHECK: Sale {SALE_ID}")
print("=" * 50)
print()

# 1. Device Card
print("1️⃣ Device Card (/parties/{}/devices):".format(PARTY_ID))
resp = requests.get(f'{base_url}/parties/{PARTY_ID}/devices', headers=headers)
for item in resp.json().get('data', []):
    if item.get('saleId') == SALE_ID:
        print(f"  Assignment ID: {item.get('id')}")
        print(f"  List Price: {item.get('listPrice')}")
        print(f"  SGK Support: {item.get('sgkSupport')}")
        print(f"  Net Payable: {item.get('netPayable')}")
        print(f"  Ear: {item.get('ear')}")
print()

# 2. Sale Detail
print(f"2️⃣ Sale Detail (/sales/{SALE_ID}):")
resp = requests.get(f'{base_url}/sales/{SALE_ID}', headers=headers)
data = resp.json().get('data', {})
print(f"  Total Amount: {data.get('totalAmount')}")
print(f"  SGK Coverage: {data.get('sgkCoverage')}")
print(f"  Final Amount: {data.get('finalAmount')}")
print(f"  Paid Amount: {data.get('paidAmount')}")
print()

# 3. Sales History
print(f"3️⃣ Sales History (/parties/{PARTY_ID}/sales):")
resp = requests.get(f'{base_url}/parties/{PARTY_ID}/sales', headers=headers)
data = resp.json().get('data', [])
# Handle both list and dict responses
if isinstance(data, dict):
    items = data.get('items', [])
else:
    items = data
for item in items:
    if item.get('id') == SALE_ID:
        print(f"  Total Amount: {item.get('totalAmount')}")
        print(f"  SGK Coverage: {item.get('sgkCoverage')}")
        print(f"  Final Amount: {item.get('finalAmount')}")
        print(f"  Paid Amount: {item.get('paidAmount')}")
print()

print("=" * 50)
print("RESULT: Values should MATCH across all 3!")
print("=" * 50)
