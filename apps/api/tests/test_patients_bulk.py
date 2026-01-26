import io
import csv
import json
from datetime import datetime
import os
import pytest
from core.models.user import User
from core.models.party import Party

def test_bulk_upload_and_export_admin(client, db_session, auth_headers):
    # auth_headers is admin by default in conftest.py
    
    # Prepare CSV content
    csv_buffer = io.StringIO()
    writer = csv.writer(csv_buffer)
    writer.writerow(['tcNumber','firstName','lastName','phone'])
    writer.writerow(['tc_001','Test','User','+905551234567'])
    writer.writerow(['tc_002','Another','Person','+905551234568'])
    csv_bytes = csv_buffer.getvalue().encode('utf-8')

    files = {
        'file': ('patients.csv', csv_bytes, 'text/csv')
    }

    resp = client.post('/api/patients/bulk_upload', files=files, headers=auth_headers)
    assert resp.status_code == 200
    d = resp.json()
    assert d['success'] is True
    assert d['created'] >= 2

    # Now test export as admin
    resp2 = client.get('/api/patients/export', headers=auth_headers)
    assert resp2.status_code == 200
    assert 'text/csv' in resp2.headers.get('Content-Type', '')
    csv_data = resp2.text
    assert 'tc_001' in csv_data
    assert 'tc_002' in csv_data


def test_export_forbidden_for_non_admin(client, db_session):
    # Create a normal user
    tenant_id = 'tenant-1'
    u = User(
        id=f'user_test_{int(datetime.now().timestamp())}', 
        username=f'user_{int(datetime.now().timestamp())}', 
        email=f'user_{int(datetime.now().timestamp())}@example.com',
        tenant_id=tenant_id,
        role='user',
        is_active=True
    )
    u.set_password('testpass')
    db_session.add(u)
    db_session.commit()

    # Generate token for normal user
    from jose import jwt
    from datetime import timedelta
    payload = {
        'sub': u.id,
        'role': u.role,
        'tenant_id': u.tenant_id,
        'user_type': 'tenant',
        'exp': datetime.utcnow() + timedelta(hours=1)
    }
    token = jwt.encode(payload, 'test-secret', algorithm='HS256')
    
    resp = client.get('/api/patients/export', headers={'Authorization': f'Bearer {token}'})
    # If the endpoint strictly requires platform admin or 'parties.export' permission
    # The middleware should catch it if the role doesn't have it.
    assert resp.status_code == 403
    d = resp.json()
    assert d['success'] is False
