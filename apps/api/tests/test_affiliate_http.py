import pytest
import uuid
from core.models.affiliate_user import AffiliateUser

def test_affiliate_register(client, db_session):
    valid_iban = 'TR260006100000000000000000'
    email = f'test_{uuid.uuid4().hex[:8]}@example.com'
    payload = {'email': email, 'password': 'password123', 'iban': valid_iban}
    resp = client.post('/api/affiliates/register', json=payload)
    assert resp.status_code == 201
    data = resp.json()['data']
    assert data['email'] == email
    
    user = db_session.query(AffiliateUser).filter_by(email=email).first()
    assert user is not None
    assert user.iban == valid_iban

def test_affiliate_login_success(client, db_session):
    email = f'test_{uuid.uuid4().hex[:8]}@example.com'
    client.post('/api/affiliates/register', json={'email': email, 'password': 'password123'})
    
    resp = client.post('/api/affiliates/login', json={'email': email, 'password': 'password123'})
    assert resp.status_code == 200
    data = resp.json()['data']
    assert data['email'] == email

def test_affiliate_login_fail(client):
    email = f'test_{uuid.uuid4().hex[:8]}@example.com'
    resp = client.post('/api/affiliates/login', json={'email': email, 'password': 'wrong'})
    assert resp.status_code == 401

def test_get_affiliate_profile(client, db_session):
    email = f'test_{uuid.uuid4().hex[:8]}@example.com'
    client.post('/api/affiliates/register', json={'email': email, 'password': 'password123'})
    
    login_resp = client.post('/api/affiliates/login', json={'email': email, 'password': 'password123'})
    affiliate_id = login_resp.json()['data']['id']
    
    resp = client.get(f'/api/affiliates/me?affiliate_id={affiliate_id}')
    assert resp.status_code == 200
    assert resp.json()['data']['email'] == email

def test_list_affiliates(client):
    e1 = f'test_{uuid.uuid4().hex[:8]}@example.com'
    e2 = f'test_{uuid.uuid4().hex[:8]}@example.com'
    client.post('/api/affiliates/register', json={'email': e1, 'password': 'pw'})
    client.post('/api/affiliates/register', json={'email': e2, 'password': 'pw'})
    
    resp = client.get('/api/affiliates/list')
    assert resp.status_code == 200
    data = resp.json()['data']
    emails = [a['email'] for a in data]
    assert e1 in emails
    assert e2 in emails
