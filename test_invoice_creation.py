#!/usr/bin/env python3
"""Test invoice creation to debug 409 duplicate error."""
import requests
import json
import uuid

# Get admin token
admin_resp = requests.post('http://localhost:5003/api/admin/auth/login', json={
    'email': 'admin@x-ear.com',
    'password': 'admin123'
}, headers={
    'Idempotency-Key': f'login-{uuid.uuid4().hex[:8]}'
})
admin_data = admin_resp.json()
print(f'Admin login response: {json.dumps(admin_data, indent=2)}')
admin_token = admin_data.get('data', {}).get('token') or admin_data.get('token') or admin_data.get('accessToken')
if not admin_token:
    print('Failed to get admin token')
    exit(1)

# Get first tenant
tenants_resp = requests.get(
    'http://localhost:5003/api/admin/tenants',
    headers={'Authorization': f'Bearer {admin_token}', 'X-Effective-Tenant-Id': 'system'}
)
tenant_id = tenants_resp.json()['data']['tenants'][0]['id']

# Switch to tenant
switch_resp = requests.post(
    'http://localhost:5003/api/admin/debug/switch-tenant',
    json={'targetTenantId': tenant_id},
    headers={
        'Authorization': f'Bearer {admin_token}',
        'Content-Type': 'application/json',
        'Idempotency-Key': f'switch-{uuid.uuid4().hex[:8]}'
    }
)
switch_data = switch_resp.json()
print(f'\nSwitch tenant response: {json.dumps(switch_data, indent=2)}')
tenant_token = switch_data.get('data', {}).get('accessToken') or switch_data.get('accessToken')
if not tenant_token:
    print('Failed to switch tenant')
    exit(1)

# Get existing sale
sales_resp = requests.get(
    'http://localhost:5003/api/sales',
    headers={'Authorization': f'Bearer {tenant_token}'}
)
sales_data = sales_resp.json()['data']
if sales_data and len(sales_data) > 0:
    sale_id = sales_data[0]['id']
    print(f'Using sale_id: {sale_id}')
    
    # Try to create invoice
    invoice_data = {
        'saleId': sale_id,
        'invoiceNumber': f'INV-TEST-{uuid.uuid4().hex[:12].upper()}',
        'invoiceDate': '2026-02-21T00:00:00Z',
        'dueDate': '2026-03-21T00:00:00Z',
        'totalAmount': 5000.0,
        'status': 'draft'
    }
    
    print(f'\nAttempting to create invoice with number: {invoice_data["invoiceNumber"]}')
    
    invoice_resp = requests.post(
        'http://localhost:5003/api/invoices',
        json=invoice_data,
        headers={
            'Authorization': f'Bearer {tenant_token}',
            'Content-Type': 'application/json',
            'Idempotency-Key': f'test-invoice-{uuid.uuid4().hex[:8]}'
        }
    )
    
    print(f'\nInvoice creation status: {invoice_resp.status_code}')
    print(f'Response: {json.dumps(invoice_resp.json(), indent=2)}')
else:
    print('No sales found')
