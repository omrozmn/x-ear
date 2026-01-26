import pytest
import json
import uuid
import time
from jose import jwt
from datetime import datetime, timedelta, timezone
from core.models.party import Party
from core.models.user import User

# =============================================================================
# ROLE PERMISSIONS (Synced with TenantPermissions)
# =============================================================================

ROLE_PERMISSIONS = {
    'admin': ['*'],
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

# =============================================================================
# HELPERS
# =============================================================================

def setup_user_and_headers(db_session, role_name, tenant_id='tenant-1'):
    """Create user and tenant in DB and return auth headers"""
    from core.models.tenant import Tenant
    
    # Ensure tenant exists
    tenant = db_session.get(Tenant, tenant_id)
    if not tenant:
        tenant = Tenant(
            id=tenant_id,
            name=f'Test Tenant {tenant_id}',
            slug=f'test-tenant-{tenant_id}',
            owner_email=f'owner@{tenant_id}.com',
            billing_email=f'billing@{tenant_id}.com',
            is_active=True,
            created_at=datetime.now(timezone.utc)
        )
        db_session.add(tenant)
        db_session.flush() # Ensure it's in DB for foreign key
    
    user_id = f'test-{role_name}-{uuid.uuid4().hex[:6]}'
    
    user = User(
        id=user_id,
        username=user_id,
        email=f'{user_id}@test.com',
        password_hash='pbkdf2:sha256:260000$dummy$hash', # Satisfy NOT NULL constraint
        role=role_name,
        tenant_id=tenant_id,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    
    payload = {
        'sub': user_id,
        'role': role_name,
        'tenant_id': tenant_id,
        'user_type': 'tenant',
        'role_permissions': ROLE_PERMISSIONS.get(role_name, []),
        'perm_ver': 1,
        'exp': datetime.now(timezone.utc) + timedelta(hours=1)
    }
    token = jwt.encode(payload, 'test-secret', algorithm='HS256')
    return {
        'Authorization': f'Bearer {token}',
        'Idempotency-Key': f"test-{uuid.uuid4().hex[:8]}"
    }

def setup_product(db_session, tenant_id='tenant-1'):
    """Create a test product in DB"""
    from core.models.inventory import InventoryItem
    product_id = f'item-{uuid.uuid4().hex[:6]}'
    
    product = InventoryItem(
        id=product_id,
        tenant_id=tenant_id,
        name='Test Product',
        brand='Test Brand',
        category='hearing_aid',
        price=100.0,
        available_inventory=10
    )
    db_session.add(product)
    db_session.commit()
    return product_id

# =============================================================================
# E2E CRUD TESTS
# =============================================================================

@pytest.mark.parametrize("role", ["admin", "manager", "user"])
def test_rbac_party_crud_lifecycle(client, db_session, role):
    """
    Verify full Party CRUD lifecycle for each role.
    All three roles should be able to Create/Read/Update.
    """
    headers = setup_user_and_headers(db_session, role)
    suffix = str(int(time.time() * 1000))[-6:]
    
    # 1. CREATE (POST)
    payload = {
        'firstName': f'E2E_{role}_{suffix}',
        'lastName': 'Tester',
        'phone': f'0555{suffix}',
        'tcNumber': f'99{suffix}001', # 2 + 6 + 3 = 11 digits
        'gender': 'M',
        'status': 'active'
    }
    
    response = client.post('/api/parties', json=payload, headers=headers)
    assert response.status_code == 201, f"Role {role} failed to create party. Response: {response.text}"
    
    created_id = response.json()['data']['id']
    
    # Verify in DB
    db_session.expunge_all()
    party = db_session.get(Party, created_id)
    assert party is not None
    assert party.first_name == payload['firstName']
    
    # 2. READ (GET)
    response = client.get(f'/api/parties/{created_id}', headers=headers)
    assert response.status_code == 200
    assert response.json()['data']['firstName'] == payload['firstName']
    
    # 3. UPDATE (PUT)
    update_payload = {'firstName': f'Updated_{role}_{suffix}', 'lastName': 'Tester', 'phone': f'0555{suffix}'}
    response = client.put(f'/api/parties/{created_id}', json=update_payload, headers=headers)
    assert response.status_code == 200, f"Role {role} failed to update party (PUT). Status: {response.status_code}. Response: {response.text}"
    
    # Verify in DB
    db_session.expunge_all()
    party = db_session.get(Party, created_id)
    assert party.first_name == update_payload['firstName']
    
    # 4. DELETE (DELETE)
    # Note: User role might not have delete permission depending on specific map
    # In my modernized map: admin/manager have it, user does not.
    response = client.delete(f'/api/parties/{created_id}', headers=headers)
    
    if role in ['admin', 'manager']:
        assert response.status_code in [200, 204], f"Role {role} failed to delete. Got {response.status_code}"
        # Verify in DB (Should be null or soft-deleted)
        db_session.expunge_all()
        party = db_session.get(Party, created_id)
        # Check if actually deleted or soft-deleted
        assert party is None or getattr(party, 'is_deleted', False) is True
    else:
        # User should get 403
        assert response.status_code == 403, f"Role {role} should not be able to delete. Got {response.status_code}"

@pytest.mark.parametrize("role", ["admin", "manager", "user"])
def test_rbac_sale_read_write(client, db_session, role):
    """Verify Sale CRUD for each role"""
    headers = setup_user_and_headers(db_session, role)
    suffix = str(int(time.time() * 1000))[-6:]
    
    # Helper: Create an orphan party first (needed for sale)
    # We use admin for this setup to ensure it exists
    admin_headers = setup_user_and_headers(db_session, 'admin')
    party_payload = {
        'firstName': f'SaleRef_{suffix}',
        'lastName': 'Tester',
        'phone': f'0544{suffix}', # Added required phone
        'tcNumber': f'98{suffix}001' # 2 + 6 + 3 = 11 digits
    }
    p_resp = client.post('/api/parties', json=party_payload, headers=admin_headers)
    assert p_resp.status_code == 201, f"Setup failed: {p_resp.text}"
    party_id = p_resp.json()['data']['id']
    
    # Helper: Create an orphanage product
    product_id = setup_product(db_session)
    
    # 1. CREATE SALE
    sale_payload = {
        'partyId': party_id,
        'productId': product_id, # Added required field
        'salesPrice': 100.0,
        'quantity': 1,
        'paymentMethod': 'cash'
    }
    
    response = client.post('/api/sales', json=sale_payload, headers=headers)
    
    # All three roles have sale:write in our setup
    assert response.status_code in [200, 201], f"Role {role} failed to create sale. Got {response.status_code}. Response: {response.text}"
    
    resp_json = response.json()
    if 'data' in resp_json and resp_json['data'] and 'saleId' in resp_json['data']:
        sale_id = resp_json['data']['saleId']
    else:
        pytest.fail(f"Could not find 'saleId' in sale creation response data: {resp_json}")
    
    # 2. UPDATE SALE (PUT)
    # Using PUT as observed in router
    update_sale_payload = {
        'partyId': party_id,
        'productId': product_id,
        'status': 'completed',
        'paymentMethod': 'cash',
        'salesPrice': 100.0,
        'quantity': 1
    }
    response = client.put(f'/api/sales/{sale_id}', json=update_sale_payload, headers=headers)
    assert response.status_code == 200, f"Update failed: {response.text}"
    
    # Verify in DB
    db_session.expunge_all()
    from models.sales import Sale
    sale = db_session.get(Sale, sale_id)
    assert sale is not None
    assert sale.status == 'completed'

def test_tenant_isolation_e2e(client, db_session):
    """Verify that role-based actions are strictly scoped to the tenant in the token"""
    
    # Create party in Tenant A
    headers_a = setup_user_and_headers(db_session, 'manager', tenant_id='tenant-A')
    payload_a = {
        'firstName': 'TenantA_Patient', 
        'lastName': 'Tester', 
        'phone': '05330000001', # Added phone
        'tcNumber': '77000000001'
    }
    resp_a = client.post('/api/parties', json=payload_a, headers=headers_a)
    assert resp_a.status_code == 201, f"Tenant A setup failed: {resp_a.text}"
    id_a = resp_a.json()['data']['id']
    
    # Attempt to read from Tenant B
    headers_b = setup_user_and_headers(db_session, 'manager', tenant_id='tenant-B')
    resp_b = client.get(f'/api/parties/{id_a}', headers=headers_b)
    
    # Should get 404 (because tenant filter returns None)
    assert resp_b.status_code == 404
    
    # Attempt to update from Tenant B
    resp_update = client.put(f'/api/parties/{id_a}', json={'firstName': 'Hacked'}, headers=headers_b)
    assert resp_update.status_code == 404
