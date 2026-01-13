#!/usr/bin/env python3
import sys
sys.path.insert(0, '.')
from app import app
import json

with app.app_context():
    with app.test_client() as client:
        # Login
        response = client.post('/api/admin/auth/login', 
            json={'email': 'admin@x-ear.com', 'password': 'admin123'},
            headers={'Content-Type': 'application/json'}
        )
        
        login_data = response.get_json()
        
        if response.status_code == 200 and login_data.get('success'):
            token = login_data['data']['token']
            print(f'✅ Login successful!')
            
            # Test /api/permissions/my
            print(f'\nTesting /api/permissions/my...')
            perms_response = client.get('/api/permissions/my',
                headers={'Authorization': f'Bearer {token}'}
            )
            
            print(f'Response status: {perms_response.status_code}')
            perms_data = perms_response.get_json()
            
            if perms_response.status_code == 200:
                print(f'✅ Permissions endpoint works!')
                print(f'Role: {perms_data["data"]["role"]}')
                print(f'Is Super Admin: {perms_data["data"]["isSuperAdmin"]}')
                print(f'Permissions count: {len(perms_data["data"]["permissions"])}')
                print(f'First 10 permissions: {perms_data["data"]["permissions"][:10]}')
            else:
                print(f'❌ Permissions endpoint failed!')
                print(f'Response: {json.dumps(perms_data, indent=2)}')
        else:
            print(f'❌ Login failed!')
