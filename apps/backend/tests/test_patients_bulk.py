import io
import csv
import json
from datetime import datetime
import os
from models.base import db
from models.user import User
from models.patient import Patient
from flask_jwt_extended import create_access_token


def test_bulk_upload_and_export_admin(client):
    # Create an admin user
    admin_username = os.getenv('ADMIN_USERNAME', 'admin')
    admin_email = os.getenv('ADMIN_EMAIL', 'admin@x-ear.com')
    with client.application.app_context():
        # Clean users table for test consistency
        db.session.query(User).filter_by(username=admin_username).delete()
        db.session.commit()
        
        user = User(id=f'user_test_admin_{int(datetime.now().timestamp())}', username=admin_username, email=admin_email, phone='+900000000')
        user.set_password('testpass')
        db.session.add(user)
        db.session.commit()
        admin_id = user.id

    # Generate JWT for admin
    with client.application.app_context():
        token = create_access_token(identity=admin_id)

    # Prepare CSV content
    csv_buffer = io.StringIO()
    writer = csv.writer(csv_buffer)
    writer.writerow(['tcNumber','firstName','lastName','phone'])
    writer.writerow(['tc_001','Test','User','+905551234567'])
    writer.writerow(['tc_002','Another','Person','+905551234568'])
    csv_bytes = csv_buffer.getvalue().encode('utf-8')

    data = {
        'file': (io.BytesIO(csv_bytes), 'patients.csv')
    }

    resp = client.post('/api/patients/bulk_upload', data=data, content_type='multipart/form-data', headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 200
    d = resp.get_json()
    assert d['success'] is True
    assert d['created'] >= 2

    # Now test export as admin
    resp2 = client.get('/api/patients/export', headers={'Authorization': f'Bearer {token}'})
    assert resp2.status_code == 200
    assert 'text/csv' in resp2.headers.get('Content-Type', '')
    csv_data = resp2.get_data(as_text=True)
    assert 'tc_001' in csv_data
    assert 'tc_002' in csv_data


def test_export_forbidden_for_non_admin(client):
    # Create a normal user
    with client.application.app_context():
        # Clean existing users to avoid UNIQUE constraint issues
        db.session.query(User).filter(User.username.like('user_%')).delete()
        db.session.commit()
        
        u = User(id=f'user_test_{int(datetime.now().timestamp())}', username=f'user_{int(datetime.now().timestamp())}', email=f'user_{int(datetime.now().timestamp())}@example.com', phone='+900000001')
        u.set_password('testpass')
        db.session.add(u)
        db.session.commit()
        user_id = u.id

    with client.application.app_context():
        token = create_access_token(identity=user_id)
    resp = client.get('/api/patients/export', headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 403
    d = resp.get_json()
    assert d['success'] is False

