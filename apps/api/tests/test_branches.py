import pytest
import uuid
from core.models.user import User
from core.models.branch import Branch
from core.models.tenant import Tenant
from core.models.party import Party
from jose import jwt
from datetime import datetime, timedelta

def generate_test_token(user_id, role, tenant_id='tenant-1'):
    payload = {
        'sub': user_id,
        'role': role,
        'tenant_id': tenant_id,
        'user_type': 'tenant',
        'exp': datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, 'test-secret', algorithm='HS256')

@pytest.fixture
def branch_data(db_session):
    suffix = str(uuid.uuid4())[:8]
    tenant = Tenant(id=f"t_{suffix}", name="Test Tenant", slug=f"slug_{suffix}", owner_email=f"o_{suffix}@x.com", billing_email=f"b_{suffix}@x.com", is_active=True)
    db_session.add(tenant)
    db_session.commit()

    admin = User(id=f"u_{suffix}", email=f"a_{suffix}@x.com", username=f"admin_{suffix}", role="tenant_admin", tenant_id=tenant.id, is_active=True)
    admin.set_password("password")
    db_session.add(admin)

    branch = Branch(id=f"b_{suffix}", name="Test Branch", tenant_id=tenant.id)
    db_session.add(branch)

    branch_admin = User(id=f"ba_{suffix}", email=f"ba_{suffix}@x.com", username=f"ba_{suffix}", role="admin", tenant_id=tenant.id, is_active=True)
    branch_admin.set_password("password")
    if hasattr(branch_admin, 'branches'):
        branch_admin.branches.append(branch)
    db_session.add(branch_admin)
    db_session.commit()

    return {
        'tenant': tenant,
        'admin': admin,
        'branch': branch,
        'branch_admin': branch_admin,
        'admin_token': generate_test_token(admin.id, admin.role, tenant.id),
        'branch_admin_token': generate_test_token(branch_admin.id, branch_admin.role, tenant.id)
    }

def test_create_branch(client, branch_data):
    token = branch_data['admin_token']
    response = client.post('/api/branches', json={
        'name': 'New Branch',
        'address': '123 Main St'
    }, headers={'Authorization': f'Bearer {token}'})
    
    assert response.status_code == 201
    assert response.json()['success'] is True

def test_get_branches_tenant_admin(client, branch_data):
    token = branch_data['admin_token']
    response = client.get('/api/branches', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 200
    assert len(response.json()['data']) >= 1

def test_get_branches_branch_admin(client, branch_data):
    token = branch_data['branch_admin_token']
    response = client.get('/api/branches', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 200
    assert len(response.json()['data']) == 1

def test_patient_filtering(client, branch_data, db_session):
    # Create patients
    p1 = Party(id=str(uuid.uuid4()), first_name="Branch", last_name="Patient", tenant_id=branch_data['tenant'].id, branch_id=branch_data['branch'].id, phone="5551")
    p2 = Party(id=str(uuid.uuid4()), first_name="Other", last_name="Patient", tenant_id=branch_data['tenant'].id, phone="5552")
    db_session.add_all([p1, p2])
    db_session.commit()

    token = branch_data['branch_admin_token']
    response = client.get('/api/patients', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 200
    assert len(response.json()['data']) == 1
    assert response.json()['data'][0]['firstName'] == "Branch"
