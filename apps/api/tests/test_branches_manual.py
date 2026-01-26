import pytest
from core.models.branch import Branch
from core.models.tenant import Tenant
from core.models.user import User
from core.models.party import Party
import uuid
from jose import jwt
from datetime import datetime, timedelta

def generate_test_token(user_id, role, tenant_id, secret='test-secret'):
    payload = {
        'sub': user_id,
        'role': role,
        'tenant_id': tenant_id,
        'user_type': 'tenant',
        'exp': datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, secret, algorithm='HS256')

@pytest.fixture
def branch_test_data(db_session):
    # Create tenant
    slug = f"test-tenant-{uuid.uuid4().hex[:8]}"
    tenant = Tenant(
        id=f"tenant-{uuid.uuid4().hex[:8]}",
        name="Test Tenant", 
        slug=slug,
        owner_email="admin@test.com",
        billing_email="admin@test.com",
        is_active=True,
        max_branches=10
    )
    db_session.add(tenant)
    db_session.commit()

    # Create tenant admin
    tenant_admin = User(
        id=f"user-{uuid.uuid4().hex[:8]}",
        email="admin@test.com",
        username="admin",
        role="tenant_admin",
        tenant_id=tenant.id,
        is_active=True
    )
    tenant_admin.set_password("password")
    db_session.add(tenant_admin)
    db_session.commit()

    # Create branch
    branch = Branch(id=f"branch-{uuid.uuid4().hex[:8]}", name="Test Branch", tenant_id=tenant.id)
    db_session.add(branch)
    db_session.commit()

    # Create branch admin
    branch_admin = User(
        id=f"user-{uuid.uuid4().hex[:8]}",
        email="branch_admin@test.com",
        username="branch_admin",
        role="admin",
        tenant_id=tenant.id,
        is_active=True
    )
    branch_admin.set_password("password")
    # In the original test, it does branch_admin.branches.append(branch)
    # Assuming the relationship exists in the new models
    if hasattr(branch_admin, 'branches'):
        branch_admin.branches.append(branch)
    db_session.add(branch_admin)
    db_session.commit()

    admin_token = generate_test_token(tenant_admin.id, tenant_admin.role, tenant.id)
    branch_admin_token = generate_test_token(branch_admin.id, branch_admin.role, tenant.id)

    return {
        'tenant': tenant,
        'tenant_admin': tenant_admin,
        'branch': branch,
        'branch_admin': branch_admin,
        'admin_token': admin_token,
        'branch_admin_token': branch_admin_token
    }

def test_create_branch(client, branch_test_data):
    token = branch_test_data['admin_token']
    response = client.post('/api/branches', json={
        'name': 'New Branch',
        'address': '123 Main St'
    }, headers={'Authorization': f'Bearer {token}'})
    
    assert response.status_code == 201
    data = response.json()
    assert data['success'] is True
    assert data['data']['name'] == 'New Branch'

def test_get_branches_tenant_admin(client, branch_test_data):
    token = branch_test_data['admin_token']
    response = client.get('/api/branches', headers={'Authorization': f'Bearer {token}'})
    
    assert response.status_code == 200
    data = response.json()
    assert len(data['data']) >= 1
    branch_ids = [b['id'] for b in data['data']]
    assert branch_test_data['branch'].id in branch_ids

def test_get_branches_branch_admin(client, branch_test_data):
    token = branch_test_data['branch_admin_token']
    response = client.get('/api/branches', headers={'Authorization': f'Bearer {token}'})
    
    assert response.status_code == 200
    data = response.json()
    # If branch admin is limited to their branches
    assert len(data['data']) == 1
    assert data['data'][0]['id'] == branch_test_data['branch'].id

def test_patient_filtering(client, branch_test_data, db_session):
    tenant = branch_test_data['tenant']
    branch = branch_test_data['branch']
    
    # Create a patient in the branch
    p1 = Party(
        id=f"party-{uuid.uuid4().hex[:8]}",
        first_name="Branch", 
        last_name="Patient", 
        phone="5551112233",
        tenant_id=tenant.id,
        branch_id=branch.id,
        tc_number="11111111111"
    )
    # Create a patient in another branch (or no branch)
    p2 = Party(
        id=f"party-{uuid.uuid4().hex[:8]}",
        first_name="Other", 
        last_name="Patient", 
        phone="5554445566",
        tenant_id=tenant.id,
        tc_number="22222222222"
    )
    db_session.add(p1)
    db_session.add(p2)
    db_session.commit()

    token = branch_test_data['branch_admin_token']
    response = client.get('/api/patients', headers={'Authorization': f'Bearer {token}'})
    
    assert response.status_code == 200
    data = response.json()
    # Verify filtering
    assert len(data['data']) == 1
    assert data['data'][0]['firstName'] == "Branch"
