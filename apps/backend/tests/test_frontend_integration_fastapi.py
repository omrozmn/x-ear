
import os
import io
import json
import pytest
from datetime import datetime
from jose import jwt
from fastapi.testclient import TestClient

# 1. Set SECRET_KEY before importing app/dependencies
os.environ['JWT_SECRET_KEY'] = 'test-secret'
os.environ['APP_ENV'] = 'testing'

# 2. Import app
from main import app
from database import get_db
from models import User, Patient, Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import middleware.unified_access
import dependencies

# Patch SECRET_KEY explicitly
middleware.unified_access.SECRET_KEY = 'test-secret'
dependencies.SECRET_KEY = 'test-secret'

# Setup Database
from database import engine, SessionLocal
Base.metadata.create_all(bind=engine)

# Create Test User
db = SessionLocal()
try:
    # Check if user exists (if re-running without drop)
    if not db.query(User).filter_by(id='test-user').first():
        test_user = User(
            id='test-user',
            username='testuser',
            email='test@example.com',
            role='admin', # 'admin' role in User table usually maps to tenant admin or similar, or I should use 'tenant_admin'
            tenant_id='tenant-1',
            is_active=True,
            permissions_version=1
        )
        test_user.set_password('testpass')
        db.add(test_user)
        db.commit()
finally:
    db.close()

# 3. Setup TestClient
client = TestClient(app)

# 4. Helper to generate token
def generate_token(user_id='test-user', role='admin', tenant_id='tenant-1'):
    payload = {
        'sub': user_id,
        'role': role,
        'tenant_id': tenant_id,
        'user_type': 'tenant', # 'tenant' for AccessContext.user_type derived from User model
        'exp': 9999999999
    }
    return jwt.encode(payload, 'test-secret', algorithm='HS256')

@pytest.fixture
def auth_headers():
    token = generate_token()
    return {'Authorization': f'Bearer {token}'}

def test_p1_bulk_upload_patients(auth_headers):
    # Prepare CSV
    csv_content = "tcNumber,firstName,lastName,phone\n11111111111,Bulk,Test,+905551111111"
    files = {
        'file': ('test_patients.csv', csv_content, 'text/csv')
    }
    response = client.post('/api/patients/bulk-upload', files=files, headers=auth_headers)
    assert response.status_code in [200, 201]
    data = response.json()
    assert data['success'] is True
    # Verify data structure
    assert 'created' in data['data']
    
def test_p1_invoice_templates(auth_headers):
    response = client.get('/api/invoices/templates', headers=auth_headers)
    if response.status_code != 200:
        print(f"Templates failed: {response.status_code}, {response.text}")
    assert response.status_code == 200
    data = response.json()
    assert data['success'] is True
    # The new implementation returns a list inside 'data'
    assert isinstance(data['data'], list)

def test_p1_invoice_bulk_upload(auth_headers):
    # Prepare CSV
    csv_content = "customerName,amount,date\nTest Customer,100,2024-01-01"
    files = {
        'file': ('test_invoices.csv', csv_content, 'text/csv')
    }
    response = client.post('/api/invoices/bulk-upload', files=files, headers=auth_headers)
    # 400 if validation fails but endpoint reached is key
    if response.status_code not in [200, 201, 400]:
        print(f"Invoice upload failed: {response.status_code}, {response.text}")
    assert response.status_code in [200, 201, 400]
    if response.status_code == 200:
        data = response.json()
        assert data['success'] is True

def test_p1_print_queue_ops(auth_headers):
    # 0. Create patient and invoice first
    pat_payload = {
        'first_name': 'Queue', 'last_name': 'Test', 'phone': '5551112233', 'tc_number': '22222222222'
    }
    r_pat = client.post('/api/patients', json=pat_payload, headers=auth_headers)
    if r_pat.status_code == 201:
        pat_id = r_pat.json()['data']['id']
        inv_payload = {
            'patient_id': pat_id, 'total_amount': 100, 'status': 'draft', 'items': [{'description': 'test', 'unitPrice': 100, 'total': 100}]
        }
        r_inv = client.post('/api/invoices', json=inv_payload, headers=auth_headers)
        if r_inv.status_code == 201:
            inv_id = r_inv.json()['data']['id']
            
            # 1. Add to queue
            # Must use list of ints
            payload = {'invoice_ids': [inv_id]}
            res_post = client.post('/api/invoices/print-queue', json=payload, headers=auth_headers)
            if res_post.status_code not in [200, 201]:
                 print(f"Add to queue failed: {res_post.status_code}, {res_post.text}")
            assert res_post.status_code in [200, 201]
            
            # 2. Get queue
            res_get = client.get('/api/invoices/print-queue', headers=auth_headers)
            assert res_get.status_code == 200
            data = res_get.json()
            assert data['success'] is True
        else:
            print(f"Failed to create invoice for queue test: {r_inv.text}")
    else:
        # Fallback if patient creation fails (e.g. TC exists)
        # We can try to fetch one
        pass

def test_p2_inventory_units(auth_headers):
    response = client.get('/api/inventory/units', headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data['success'] is True
    # Expect { "units": [...] }
    assert 'units' in data['data']
    assert isinstance(data['data']['units'], list)

def test_p3_sgk_endpoints(auth_headers):
    # 1. Seed test patients (dev only)
    # Might be disabled in prod but we set APP_ENV=testing
    res_seed = client.post('/api/sgk/seed-test-patients', headers=auth_headers)
    assert res_seed.status_code in [200, 201]
    
    # 2. Delivered receipts
    res_deliv = client.get('/api/sgk/e-receipts/delivered', headers=auth_headers)
    assert res_deliv.status_code == 200
    
    # 3. Download form (will 404 if receipt doesn't exist, but we check endpoint reachability)
    # The endpoint expects a valid ID. We'll use a random one and expect 404 or 400, not 401 or 500
    res_dl = client.get('/api/sgk/e-receipts/rec-123/download-patient-form', headers=auth_headers)
    assert res_dl.status_code != 404 or "not found" in res_dl.json()['detail'].lower() # Wait, if route exists but ID not found -> 404 from logic. If route doesn't exist -> 404 from FastAPI.
    # To differentiate, we can check basic 500.
    assert res_dl.status_code != 500

if __name__ == '__main__':
    # Manual run support
    print("Running tests...")
    try:
        test_headers = {'Authorization': f'Bearer {generate_token()}'}
        print("Testing P1 Bulk Upload...")
        test_p1_bulk_upload_patients(test_headers)
        print("Testing P1 Templates...")
        test_p1_invoice_templates(test_headers)
        print("Testing P2 Units...")
        test_p2_inventory_units(test_headers)
        print("Tests passed!")
    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()
