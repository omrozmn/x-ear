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
        
        print(f'Login Response status: {response.status_code}')
        login_data = response.get_json()
        print(f'Login Response data: {json.dumps(login_data, indent=2)}')
        
        if response.status_code == 200 and login_data.get('success'):
            token = login_data['data']['token']
            print(f'\nToken (first 100 chars): {token[:100]}...')
            
            # Decode token to see identity
            import jwt
            decoded = jwt.decode(token, options={"verify_signature": False})
            print(f'\nDecoded token:')
            print(f'  Identity (sub): {decoded.get("sub")}')
            print(f'  Claims: {json.dumps({k:v for k,v in decoded.items() if k != "sub"}, indent=4)}')
            
            # Test /api/users/me endpoint
            print(f'\n--- Testing /api/users/me endpoint ---')
            me_response = client.get('/api/users/me', 
                headers={'Authorization': f'Bearer {token}'}
            )
            print(f'Response status: {me_response.status_code}')
            print(f'Response data: {json.dumps(me_response.get_json(), indent=2)}')
