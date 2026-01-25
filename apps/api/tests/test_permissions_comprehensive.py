import pytest
import json
import os
from jose import jwt
from datetime import datetime, timedelta, timezone

from main import app
from core.models.role import Role
from core.models.permission import Permission
from config.permissions_map import ENDPOINT_PERMISSIONS

# =============================================================================
# TEST CONFIGURATION
# =============================================================================

ROLE_PERMISSIONS = {
    'admin': [
        'patient:read', 'patient:write', 'patient:delete', 'patient:export',
        'inventory:read', 'inventory:write',
        'sale:read', 'sale:write',
        'appointment:read', 'appointment:write',
        'supplier:read', 'supplier:write', 'supplier:delete',
        'invoice:read', 'invoice:write', 'invoice:delete', 'invoice:export',
        'tenant:manage', 'user:manage',
        'dashboard:read',
        'branches:read', 'branches:write', 'branches:delete',
        'payments:read', 'payments:write',
        'users:read', 'users:write', 'users:delete',
        'cash_records:read', 'cash_records:write', 'cash_records:delete',
        'campaign:read', 'campaign:write',
        'ocr:read', 'ocr:write',
        'role:read', 'role:write',
        'activity_logs:read',
        'sms:read', 'sms:write',
    ],
    'manager': [
        'patient:read', 'patient:write', 'patient:delete', 'patient:export',
        'inventory:read', 'inventory:write',
        'sale:read', 'sale:write',
        'appointment:read', 'appointment:write',
        'supplier:read', 'supplier:write',
        'invoice:read', 'invoice:write', 'invoice:export',
        'dashboard:read',
        'branches:read',
        'payments:read', 'payments:write',
        'cash_records:read', 'cash_records:write',
        'campaign:read', 'campaign:write',
        'ocr:read', 'ocr:write',
    ],
    'user': [
        'patient:read', 'patient:write',
        'inventory:read',
        'sale:read', 'sale:write',
        'appointment:read', 'appointment:write',
        'supplier:read',
        'invoice:read',
        'dashboard:read',
        'branches:read',
        'payments:read',
        'cash_records:read',
        'ocr:read', 'ocr:write',
    ],
}

TEST_ENDPOINTS = [
    ('GET', '/api/parties', 'patient:read', None),
    ('POST', '/api/parties', 'patient:write', {'firstName': 'Test', 'lastName': 'User', 'phone': '5551234567'}),
    ('GET', '/api/sales', 'sale:read', None),
    ('POST', '/api/sales', 'sale:write', {'partyId': 'test123', 'items': []}),
    ('GET', '/api/invoices', 'invoice:read', None),
    ('GET', '/api/branches', 'branches:read', None),
    ('POST', '/api/branches', 'branches:write', {'name': 'New Branch'}),
    ('GET', '/api/inventory', 'inventory:read', None),
    ('GET', '/api/dashboard', 'dashboard:read', None),
    ('GET', '/api/appointments', 'appointment:read', None),
    ('POST', '/api/appointments', 'appointment:write', {'partyId': 'test', 'date': '2025-01-01'}),
]

# =============================================================================
# HELPERS
# =============================================================================

def generate_token(role_name, tenant_id='tenant-1'):
    payload = {
        'sub': f'user_{role_name}',
        'role': role_name,
        'tenant_id': tenant_id,
        'user_type': 'tenant',
        'exp': datetime.now(timezone.utc) + timedelta(hours=1),
        'role_permissions': ROLE_PERMISSIONS.get(role_name, []),
        'perm_ver': 1
    }
    return jwt.encode(payload, 'test-secret', algorithm='HS256')

@pytest.mark.parametrize("method,path,permission,body,role_name", [
    (m, p, perm, b, role) 
    for (m, p, perm, b) in TEST_ENDPOINTS 
    for role in ROLE_PERMISSIONS.keys()
])
def test_endpoint_permission(client, method, path, permission, body, role_name):
    token = generate_token(role_name)
    headers = {'Authorization': f'Bearer {token}'}
    
    should_have_access = permission in ROLE_PERMISSIONS.get(role_name, [])
    
    if method == 'GET':
        response = client.get(path, headers=headers)
    elif method == 'POST':
        response = client.post(path, json=body or {}, headers=headers)
    elif method == 'PUT':
        response = client.put(path, json=body or {}, headers=headers)
    elif method == 'PATCH':
        response = client.patch(path, json=body or {}, headers=headers)
    elif method == 'DELETE':
        response = client.delete(path, headers=headers)
    else:
        pytest.fail(f"Unknown method: {method}")
    
    if should_have_access:
        # Access should be granted - NOT 403
        assert response.status_code != 403, \
            f"Role '{role_name}' should have access to {method} {path}, but got 403. Body: {response.text}"
    else:
        # Access should be denied - 403
        assert response.status_code == 403, \
            f"Role '{role_name}' should NOT have access to {method} {path}, but got {response.status_code}"

class TestSecurityBoundaries:
    def test_no_token_returns_401(self, client):
        response = client.get('/api/parties')
        assert response.status_code in [401, 422]

    def test_invalid_token_returns_401(self, client):
        response = client.get('/api/parties', headers={'Authorization': 'Bearer invalid'})
        assert response.status_code in [401, 422]
