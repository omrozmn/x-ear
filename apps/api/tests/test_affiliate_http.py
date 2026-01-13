from app import app
from models.affiliate_user import AffiliateUser
from models.base import db
import json
import pytest
from unittest.mock import patch, MagicMock

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.session.remove()
            db.drop_all()

import uuid

def generate_email():
    return f'test_{uuid.uuid4().hex[:8]}@example.com'

def test_affiliate_register(client):
    # Use valid IBAN with correct checksum
    valid_iban = 'TR260006100000000000000000'
    email = generate_email()
    payload = {'email': email, 'password': 'password123', 'iban': valid_iban}
    resp = client.post('/api/affiliate/register', json=payload)
    if resp.status_code != 201:
        print("DEBUG REG FAIL:", resp.get_json())
    assert resp.status_code == 201
    json_resp = resp.get_json()
    # Handle response envelope if present
    data = json_resp.get('data', json_resp)
    assert data['email'] == email
    
    with app.app_context():
        user = db.session.query(AffiliateUser).filter_by(email=email).first()
        assert user is not None
        assert user.iban == valid_iban

def test_affiliate_login_success(client):
    email = generate_email()
    reg_resp = client.post('/api/affiliate/register', json={'email': email, 'password': 'password123'})
    if reg_resp.status_code != 201:
        print("DEBUG LOGIN-REG FAIL:", reg_resp.get_json())
    assert reg_resp.status_code == 201
    
    resp = client.post('/api/affiliate/login', json={'email': email, 'password': 'password123'})
    if resp.status_code != 200:
        print("DEBUG LOGIN FAIL:", resp.get_json())

    assert resp.status_code == 200
    json_resp = resp.get_json()
    data = json_resp.get('data', json_resp)
    assert 'email' in data
    assert data['email'] == email

def test_affiliate_login_fail(client):
    email = generate_email()
    # No registration
    resp = client.post('/api/affiliate/login', json={'email': email, 'password': 'wrong'})
    # Expect 401 because user not found
    assert resp.status_code == 401
    
    # Registration then wrong password
    client.post('/api/affiliate/register', json={'email': email, 'password': 'password123'})
    resp = client.post('/api/affiliate/login', json={'email': email, 'password': 'wrong'})
    assert resp.status_code == 401

def test_get_affiliate_profile(client):
    email = generate_email()
    reg_resp = client.post('/api/affiliate/register', json={'email': email, 'password': 'password123'})
    assert reg_resp.status_code == 201
    
    login_resp = client.post('/api/affiliate/login', json={'email': email, 'password': 'password123'})
    login_json = login_resp.get_json()
    login_data = login_json.get('data', login_json)
    affiliate_id = login_data['id']
    
    resp = client.get(f'/api/affiliate/me?affiliate_id={affiliate_id}')
    assert resp.status_code == 200
    json_resp = resp.get_json()
    data = json_resp.get('data', json_resp)
    assert data['email'] == email

def test_list_affiliates(client):
    e1 = generate_email()
    e2 = generate_email()
    client.post('/api/affiliate/register', json={'email': e1, 'password': 'pw'})
    client.post('/api/affiliate/register', json={'email': e2, 'password': 'pw'})
    
    resp = client.get('/api/affiliate/list')
    assert resp.status_code == 200
    json_resp = resp.get_json()
    data = json_resp.get('data', json_resp)
    
    assert isinstance(data, list)
    # Since DB might accumulate, just check valid content
    assert len(data) >= 2
    emails = [a['email'] for a in data]
    assert e1 in emails
    assert e2 in emails
