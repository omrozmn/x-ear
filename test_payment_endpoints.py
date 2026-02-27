#!/usr/bin/env python3
"""Test payment-related endpoints to debug ID extraction."""
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
}, headers={'Idempotency-Key': make_idempotency_key('login')})
admin_token = admin_resp.json()['data']['token']

# 2. Get tenant
tenants_resp = requests.get(
    f'{BASE_URL}/api/admin/tenants',
    headers={'Authorization': f'Bearer {admin_token}', 'X-Effective-Tenant-Id': 'system'}
)
tenant_id = tenants_resp.json()['data']['tenants'][0]['id']

# 3. Switch to tenant
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

# 4. Get existing sale OR use hardcoded one
print("\n2. Getting existing sale...")
# Use the sale we just created or get from list
sale_id = "2602230104"  # From previous test
print(f"Using sale_id: {sale_id}")

# 5. Test Payment Record creation
print("\n3. Testing Payment Record creation...")
payment_data = {
    'amount': 500.0,
    'paymentMethod': 'CASH',
    'paymentDate': '2026-02-23T00:00:00Z',
    'status': 'COMPLETED',
    'notes': 'Test payment'
}
payment_resp = requests.post(
    f'{BASE_URL}/api/sales/{sale_id}/payments',
    json=payment_data,
    headers={
        'Authorization': f'Bearer {tenant_token}',
        'Content-Type': 'application/json',
        'Idempotency-Key': make_idempotency_key('payment')
    }
)
print(f"Payment Record Response ({payment_resp.status_code}):")
print(json.dumps(payment_resp.json(), indent=2))

# 6. Test Promissory Note creation
print("\n4. Testing Promissory Note creation...")
note_data = {
    'saleId': sale_id,
    'amount': 1000.0,
    'dueDate': '2026-03-23T00:00:00Z',
    'status': 'PENDING',
    'noteNumber': f'PN-TEST-{uuid.uuid4().hex[:8]}'
}
note_resp = requests.post(
    f'{BASE_URL}/api/promissory-notes',
    json=note_data,
    headers={
        'Authorization': f'Bearer {tenant_token}',
        'Content-Type': 'application/json',
        'Idempotency-Key': make_idempotency_key('note')
    }
)
print(f"Promissory Note Response ({note_resp.status_code}):")
print(json.dumps(note_resp.json(), indent=2))

# 7. Test Payment Plan creation (creates installments)
print("\n5. Testing Payment Plan creation...")
plan_data = {
    'numberOfInstallments': 3,
    'installmentAmount': 1666.67,
    'startDate': '2026-03-01T00:00:00Z'
}
plan_resp = requests.post(
    f'{BASE_URL}/api/sales/{sale_id}/payment-plan',
    json=plan_data,
    headers={
        'Authorization': f'Bearer {tenant_token}',
        'Content-Type': 'application/json',
        'Idempotency-Key': make_idempotency_key('plan')
    }
)
print(f"Payment Plan Response ({plan_resp.status_code}):")
print(json.dumps(plan_resp.json(), indent=2))
