#!/usr/bin/env python3
import sys
sys.path.insert(0, '.')
from app import app, db
from models.admin_user import AdminUser
import jwt as pyjwt

with app.app_context():
    # Find admin user
    admin = AdminUser.query.filter_by(email='admin@x-ear.com').first()
    if admin:
        print(f'Admin user found: {admin.email}')
        print(f'Admin ID: {admin.id}')
        
        # Prefer real login endpoint to obtain a token.
        with app.test_client() as client:
            login = client.post(
                '/api/admin/auth/login',
                json={'email': admin.email, 'password': 'admin123'},
                headers={'Content-Type': 'application/json'}
            )
            login_data = login.get_json() or {}
            if login.status_code != 200:
                print(f'Login failed: {login.status_code} - {login_data}')
                raise SystemExit(1)

            token = (login_data.get('data') or {}).get('token') or (login_data.get('data') or {}).get('accessToken')
            if not token:
                print(f'Login returned no token: {login_data}')
                raise SystemExit(1)

            print(f'Token acquired: {token[:50]}...')
        
            # Test the endpoint
            response = client.get('/api/users/me', headers={'Authorization': f'Bearer {token}'})
            print(f'Response status: {response.status_code}')
            print(f'Response data: {response.get_json()}')
    else:
        print('Admin user not found')
