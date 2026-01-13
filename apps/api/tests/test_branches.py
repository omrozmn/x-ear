import pytest
import sys
import os

# Add parent directory to path to import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app as flask_app
from models.base import db
from models.user import User
from models.branch import Branch
from models.tenant import Tenant
from models.patient import Patient
from flask_jwt_extended import create_access_token

@pytest.fixture
def app():
    # Configure app for testing
    flask_app.config['TESTING'] = True
    flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with flask_app.app_context():
        db.create_all()
        yield flask_app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def tenant(app):
    tenant = Tenant(name="Test Tenant", domain="test.com")
    db.session.add(tenant)
    db.session.commit()
    return tenant

@pytest.fixture
def tenant_admin(app, tenant):
    user = User(
        email="admin@test.com",
        password="password",
        role="tenant_admin",
        tenant_id=tenant.id,
        first_name="Admin",
        last_name="User"
    )
    user.set_password("password")
    db.session.add(user)
    db.session.commit()
    return user

@pytest.fixture
def branch(app, tenant):
    branch = Branch(name="Test Branch", tenant_id=tenant.id)
    db.session.add(branch)
    db.session.commit()
    return branch

@pytest.fixture
def branch_admin(app, tenant, branch):
    user = User(
        email="branch_admin@test.com",
        password="password",
        role="admin",
        tenant_id=tenant.id,
        first_name="Branch",
        last_name="Admin"
    )
    user.set_password("password")
    user.branches.append(branch)
    db.session.add(user)
    db.session.commit()
    return user

@pytest.fixture
def admin_token(tenant_admin):
    return create_access_token(identity=tenant_admin.id)

@pytest.fixture
def branch_admin_token(branch_admin):
    return create_access_token(identity=branch_admin.id)

def test_create_branch(client, admin_token):
    response = client.post('/api/branches', json={
        'name': 'New Branch',
        'address': '123 Main St'
    }, headers={'Authorization': f'Bearer {admin_token}'})
    
    assert response.status_code == 201
    assert response.json['success'] is True
    assert response.json['data']['name'] == 'New Branch'

def test_get_branches_tenant_admin(client, admin_token, branch):
    response = client.get('/api/branches', headers={'Authorization': f'Bearer {admin_token}'})
    
    assert response.status_code == 200
    assert len(response.json['data']) >= 1
    # Check if created branch is in the list
    branch_ids = [b['id'] for b in response.json['data']]
    assert branch.id in branch_ids

def test_get_branches_branch_admin(client, branch_admin_token, branch):
    response = client.get('/api/branches', headers={'Authorization': f'Bearer {branch_admin_token}'})
    
    assert response.status_code == 200
    assert len(response.json['data']) == 1
    assert response.json['data'][0]['id'] == branch.id

def test_patient_filtering(client, branch_admin_token, tenant_admin, branch, app):
    # Create a patient in the branch
    with app.app_context():
        p1 = Patient(
            first_name="Branch", 
            last_name="Patient", 
            tenant_id=tenant_admin.tenant_id,
            branch_id=branch.id,
            tc_number="11111111111"
        )
        # Create a patient in another branch (or no branch)
        p2 = Patient(
            first_name="Other", 
            last_name="Patient", 
            tenant_id=tenant_admin.tenant_id,
            tc_number="22222222222"
        )
        db.session.add(p1)
        db.session.add(p2)
        db.session.commit()

    response = client.get('/api/patients', headers={'Authorization': f'Bearer {branch_admin_token}'})
    
    assert response.status_code == 200
    assert len(response.json['data']) == 1
    assert response.json['data'][0]['firstName'] == "Branch"
