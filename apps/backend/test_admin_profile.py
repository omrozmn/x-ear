#!/usr/bin/env python3
import sys
sys.path.insert(0, '.')
from app import app, db
from models.admin_user import AdminUser
from flask_jwt_extended import create_access_token

with app.app_context():
    # Find admin user
    admin = AdminUser.query.filter_by(email='admin@x-ear.com').first()
    if admin:
        print(f'Admin user found: {admin.email}')
        print(f'Admin ID: {admin.id}')
        
        # Create token
        token = create_access_token(identity=admin.id)
        print(f'Token created: {token[:50]}...')
        
        # Test the endpoint
        with app.test_client() as client:
            response = client.get('/api/users/me', headers={'Authorization': f'Bearer {token}'})
            print(f'Response status: {response.status_code}')
            print(f'Response data: {response.get_json()}')
    else:
        print('Admin user not found')
