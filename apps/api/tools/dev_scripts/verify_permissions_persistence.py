import sys
import os
# Add backend root to path to allow imports from app, models, etc.
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

import requests
import json
from app import app
from models import User, Role, Permission, db

def verify_persistence():
    with app.app_context():
        # 1. Setup Context
        admin = User.query.filter_by(role='super_admin').first()
        if not admin:
            admin = User.query.filter_by(email='admin@x-ear.com').first()
        
        client = app.test_client()

        # Use real admin login to obtain token (avoid Flask-JWT-Extended dependency)
        login = client.post(
            '/api/admin/auth/login',
            json={'email': getattr(admin, 'email', 'admin@x-ear.com'), 'password': 'admin123'},
            headers={'Content-Type': 'application/json'},
        )
        if login.status_code != 200:
            print(f"Login failed: {login.status_code} - {login.get_json()}")
            return

        login_data = login.get_json() or {}
        token = (login_data.get('data') or {}).get('token') or (login_data.get('data') or {}).get('accessToken')
        if not token:
            print(f"Login returned no token: {login_data}")
            return

        headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

        # 2. Verify Filtering (List all perms)
        print("\n--- 1. Checking Filtered Permissions List ---")
        resp = client.get('/api/permissions', headers=headers)
        if resp.status_code == 200:
            data = resp.json
            all_perms = data.get('all', [])
            admin_perms = [p['name'] for p in all_perms if p['name'].startswith('admin.')]
            activity_perms = [p['name'] for p in all_perms if p['name'].startswith('activity_logs.')]
            
            print(f"Total Visible Permissions: {len(all_perms)}")
            if admin_perms:
                print(f"FAIL: Found {len(admin_perms)} 'admin.' permissions! Examples: {admin_perms[:3]}")
            else:
                print("PASS: No 'admin.' permissions found.")
                
            if activity_perms:
                 print(f"WARN: Found {len(activity_perms)} 'activity_logs.' permissions. Examples: {activity_perms[:3]}")
            
            # Check for 'admin' category in grouped data
            grouped = data.get('data', [])
            # grouped is a list of dicts: [{'category': 'patients', ...}, ...]
            admin_group = next((g for g in grouped if isinstance(g, dict) and g.get('category') == 'admin'), None)
            
            if admin_group:
                print(f"FAIL: Found 'admin' category group with {len(admin_group.get('permissions', []))} permissions.")
            else:
                print("PASS: 'admin' category not found in groups.")
                
            if len(all_perms) == 0:
                 print("WARN: 0 permissions returned. Dumping all permission names in DB to check:")
                 all_db_perms = Permission.query.all()
                 print([p.name for p in all_db_perms[:10]])


        # 3. Verify Persistence (Update Role)
        ROLE_NAME = 'odyolog'
        TEST_PERMS = ['patients.view', 'patients.create', 'calendar.view']
        
        print(f"\n--- 2. Updating Role '{ROLE_NAME}' ---")
        # Update
        update_payload = {'permissions': TEST_PERMS}
        resp = client.put(f'/api/permissions/role/{ROLE_NAME}', headers=headers, json=update_payload)
        print(f"Update Status: {resp.status_code}")
        
        # Read Back
        resp = client.get(f'/api/permissions/role/{ROLE_NAME}', headers=headers)
        if resp.status_code == 200:
            current_perms = resp.json.get('permissions', [])
            print(f"Permissions after update: {current_perms}")
            
            missing = set(TEST_PERMS) - set(current_perms)
            if not missing:
                 print("PASS: Permissions persisted correctly.")
            else:
                 print(f"FAIL: Missing permissions: {missing}")
        else:
            print(f"Failed to read role: {resp.status_code}")

if __name__ == "__main__":
    verify_persistence()
