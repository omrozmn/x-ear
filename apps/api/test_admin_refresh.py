#!/usr/bin/env python3
import sys
sys.path.insert(0, '.')
from app import app
import json

with app.app_context():
    with app.test_client() as client:
        # 1. Login
        print('1. Logging in as admin@x-ear.com...')
        response = client.post('/api/admin/auth/login', 
            json={'email': 'admin@x-ear.com', 'password': 'admin123'},
            headers={'Content-Type': 'application/json'}
        )
        
        print(f'Login Response status: {response.status_code}')
        login_data = response.get_json()
        
        if response.status_code == 200 and login_data.get('success'):
            token = login_data['data']['token']
            refresh_token = login_data['data'].get('refreshToken')
            
            print(f'✅ Login successful!')
            print(f'Access Token: {token[:50]}...')
            print(f'Refresh Token: {refresh_token[:50] if refresh_token else "NOT PROVIDED"}...')
            
            if not refresh_token:
                print('❌ ERROR: Refresh token not provided!')
                sys.exit(1)
            
            # 2. Test refresh endpoint
            print(f'\n2. Testing refresh endpoint...')
            refresh_response = client.post('/api/auth/refresh',
                headers={'Authorization': f'Bearer {refresh_token}'}
            )
            
            print(f'Refresh Response status: {refresh_response.status_code}')
            refresh_data = refresh_response.get_json()
            print(f'Refresh Response data: {json.dumps(refresh_data, indent=2)}')
            
            if refresh_response.status_code == 200 and refresh_data.get('success'):
                new_token = refresh_data.get('access_token')
                print(f'✅ Token refresh successful!')
                print(f'New Access Token: {new_token[:50]}...')
                
                # 3. Test /api/users/me with new token
                print(f'\n3. Testing /api/users/me with new token...')
                me_response = client.get('/api/users/me',
                    headers={'Authorization': f'Bearer {new_token}'}
                )
                print(f'Response status: {me_response.status_code}')
                me_data = me_response.get_json()
                
                if me_response.status_code == 200:
                    print(f'✅ /api/users/me works with refreshed token!')
                    print(f'User data: {json.dumps(me_data, indent=2)}')
                else:
                    print(f'❌ /api/users/me failed with refreshed token!')
            else:
                print(f'❌ Token refresh failed!')
        else:
            print(f'❌ Login failed!')
