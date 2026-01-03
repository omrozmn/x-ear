#!/usr/bin/env python3
import sys
sys.path.insert(0, '.')
from app import app
import json
import jwt as pyjwt

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
            refresh_token = login_data['data'].get('refreshToken')
            
            # Decode tokens
            print('=== ACCESS TOKEN ===')
            access_decoded = pyjwt.decode(token, options={"verify_signature": False})
            print(json.dumps(access_decoded, indent=2))
            
            print('\n=== REFRESH TOKEN ===')
            refresh_decoded = pyjwt.decode(refresh_token, options={"verify_signature": False})
            print(json.dumps(refresh_decoded, indent=2))
