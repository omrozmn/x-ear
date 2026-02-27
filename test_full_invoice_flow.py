#!/usr/bin/env python3
"""Test full invoice creation flow: party → item → sale → invoice."""
import requests
import json
import uuid
import time

BASE_URL = 'http://localhost:5003'

def make_idempotency_key(prefix):
    return f'{prefix}-{int(time.time())}-{uuid.uuid4().hex[:8]}'

# 1. Admin login
print("1. Admin login...")
admin_resp = requests.post(f'{BASE_URL}/api/admin/auth/login', json={
    'email': 'admin@x-ear.com',
    'password': 'admin123'
}, headers={
    'Idempotency-Key': make_idempotency_key('login')
})
admin_token = admin_resp.json()['data']['token']
print(f"✓ Admin token: {admin_token[:50]}...")

# 2. Get first tenant
print("\n2. Getting tenant...")
tenants_resp = requests.get(
    f'{BASE_URL}/api/admin/tenants',
    headers={'Authorization': f'Bearer {admin_token}', 'X-Effective-Tenant-Id': 'system'}
)
tenant_id = tenants_resp.json()['data']['tenants'][0]['id']
print(f"✓ Tenant ID: {tenant_id}")

# 3. Switch to tenant
print("\n3. Switching to tenant...")
switch_resp = requests.post(
    f'{BASE_URL}/api/admin/debug/switch-tenant',
    json={'targetTenantId': tenant_id},
    headers={
        'Authorization': f'Bearer {admin_token}',
        'Content-Type': 'application/json',
        'Idempotency-Key': make_idempotency_key('switch')
    }
)
tenant_token = switch_resp.json()['data']['accessToken']
print(f"✓ Tenant token: {tenant_token[:50]}...")

# 4. Create party
print("\n4. Creating party...")
suffix = uuid.uuid4().hex[:8]
party_data = {
    'firstName': f'Test-{suffix}',
    'lastName': 'User',
    'phone': f'+905{suffix[:9]}',
    'email': f'test-{suffix}@example.com',
    'partyType': 'PERSON'
}
party_resp = requests.post(
    f'{BASE_URL}/api/parties',
    json=party_data,
    headers={
        'Authorization': f'Bearer {tenant_token}',
        'Content-Type': 'application/json',
        'Idempotency-Key': make_idempotency_key('party')
    }
)
party_json = party_resp.json()
print(f"Party response: {json.dumps(party_json, indent=2)}")
party_id = party_json.get('data', {}).get('party', {}).get('id') or party_json.get('data', {}).get('id')
if not party_id:
    print("Failed to extract party ID")
    exit(1)
print(f"✓ Party ID: {party_id}")

# 5. Create item
print("\n5. Creating item...")
item_data = {
    'name': f'Test Item {suffix}',
    'sku': f'SKU-{suffix}',
    'category': 'HEARING_AID',
    'brand': 'Test Brand',
    'quantity': 10,
    'unitPrice': 5000.0,
    'unit': 'PIECE'
}
item_resp = requests.post(
    f'{BASE_URL}/api/inventory',
    json=item_data,
    headers={
        'Authorization': f'Bearer {tenant_token}',
        'Content-Type': 'application/json',
        'Idempotency-Key': make_idempotency_key('item')
    }
)
item_json = item_resp.json()
print(f"Item response status: {item_resp.status_code}")
print(f"Item response: {json.dumps(item_json, indent=2)}")
item_id = item_json.get('data', {}).get('item', {}).get('id') or item_json.get('data', {}).get('id')
if not item_id:
    print(f"Failed to extract item ID")
    exit(1)
print(f"✓ Item ID: {item_id}")

# 6. Create sale
print("\n6. Creating sale...")
sale_data = {
    'partyId': party_id,
    'productId': item_id,
    'saleDate': '2026-02-23T00:00:00Z',
    'totalAmount': 5000.0,
    'paidAmount': 1000.0,
    'paymentMethod': 'CASH',
    'status': 'PENDING'
}
sale_resp = requests.post(
    f'{BASE_URL}/api/sales',
    json=sale_data,
    headers={
        'Authorization': f'Bearer {tenant_token}',
        'Content-Type': 'application/json',
        'Idempotency-Key': make_idempotency_key('sale')
    }
)
sale_json = sale_resp.json()
sale_id = sale_json.get('data', {}).get('sale', {}).get('id') or sale_json.get('data', {}).get('id')
if not sale_id:
    print(f"Failed to extract sale ID: {json.dumps(sale_json, indent=2)}")
    exit(1)
print(f"✓ Sale ID: {sale_id}")

# 7. Create invoice
print("\n7. Creating invoice...")
invoice_data = {
    'saleId': sale_id,
    'invoiceNumber': f'INV-TEST-{uuid.uuid4().hex[:12].upper()}',
    'invoiceDate': '2026-02-23T00:00:00Z',
    'dueDate': '2026-03-23T00:00:00Z',
    'totalAmount': 5000.0,
    'status': 'draft'
}
invoice_resp = requests.post(
    f'{BASE_URL}/api/invoices',
    json=invoice_data,
    headers={
        'Authorization': f'Bearer {tenant_token}',
        'Content-Type': 'application/json',
        'Idempotency-Key': make_idempotency_key('invoice')
    }
)

print(f"\n8. Invoice creation result:")
print(f"Status: {invoice_resp.status_code}")
print(f"Response: {json.dumps(invoice_resp.json(), indent=2)}")

if invoice_resp.status_code in [200, 201]:
    invoice_id = invoice_resp.json().get('data', {}).get('invoice', {}).get('id')
    print(f"\n✓ SUCCESS! Invoice ID: {invoice_id}")
else:
    print(f"\n✗ FAILED!")
