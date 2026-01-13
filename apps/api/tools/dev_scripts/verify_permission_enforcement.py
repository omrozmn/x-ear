import sys
import os
# Add backend root to path to allow imports from app, models, etc.
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

import requests
import json
from app import app
from models import User, Role, Permission, db

def verify_enforcement():
    with app.app_context():
        # Setup: Create/Get 'test_role' and a user assigned to it
        role_name = 'test_enforcement_role'
        role = Role.query.filter_by(name=role_name).first()
        if not role:
            role = Role(name=role_name, description='Role for enforcement testing')
            db.session.add(role)
            db.session.commit()
            
        user = User.query.filter_by(email='test_enforcer@x-ear.com').first()
        if not user:
             # Need a valid tenant_id if multi-tenant
             # Finding valid tenant first
             from models import Tenant
             tenant = Tenant.query.first()
             tenant_id = tenant.id if tenant else 'test_tenant'
             
             user = User(
                 email='test_enforcer@x-ear.com', 
                 username='test_enforcer',
                 first_name='Test',
                 last_name='Enforcer',
                 role=role_name, 
                 tenant_id=tenant_id
             )
             user.set_password('password')
             db.session.add(user)
             db.session.commit()
        
        # Helper to update permissions
        def set_permissions(perms):
            role.permissions.clear()
            for pname in perms:
                p = Permission.query.filter_by(name=pname).first()
                if not p:
                    p = Permission(name=pname, description=f"Auto created for test {pname}")
                    db.session.add(p)
                    db.session.commit() # Commit to get ID
                role.permissions.append(p)
            db.session.commit()
            
        # Helper to test endpoint
        client = app.test_client()

        # Prefer real login endpoint to obtain a token for the test user.
        login = client.post(
            '/api/auth/login',
            json={'username': user.email, 'password': 'password'},
            headers={'Content-Type': 'application/json'},
        )
        if login.status_code != 200:
            print(f"Login failed for enforcement test user: {login.status_code} - {login.get_json()}")
            return

        login_data = login.get_json() or {}
        token_payload = login_data.get('data') or login_data
        token = token_payload.get('access_token') or token_payload.get('token') or token_payload.get('accessToken')
        if not token:
            print(f"Login returned no token: {login_data}")
            return

        headers = {'Authorization': f'Bearer {token}'}

        def check_access(endpoint, method='GET', expected_code=200):
            if method == 'GET':
                resp = client.get(endpoint, headers=headers)
            elif method == 'POST':
                resp = client.post(endpoint, headers=headers, json={})
            
            success = resp.status_code == expected_code
            status_mark = "PASS" if success else "FAIL"
            print(f"[{status_mark}] {method} {endpoint} -> Expected {expected_code}, Got {resp.status_code}")
            return success

        print("\n--- Test 1: Full Permissions (Expect 200) ---")
        set_permissions(['patients.view', 'patients.create', 'dashboard.view'])
        check_access('/api/patients', 'GET', 200)
        # check_access('/api/dashboard', 'GET', 200) # Dashboard might need more setup

        print("\n--- Test 2: Revoke patients.view (Expect 403) ---")
        set_permissions(['patients.create', 'dashboard.view']) # Removed patients.view
        check_access('/api/patients', 'GET', 403)
        
        print("\n--- Test 3: Revoke patients.create (Expect 403) ---")
        set_permissions(['patients.view', 'dashboard.view']) # Removed patients.create
        check_access('/api/patients', 'POST', 403)

        print("\n--- Test 4: Revoke dashboard.view (Expect 403) ---")
        set_permissions(['patients.view']) # Removed dashboard.view
        check_access('/api/dashboard/stats', 'GET', 403)

        print("\n--- Test 5: Sales Access (sales.view) ---")
        set_permissions(['sales.view', 'patients.view']) # sales usually need patients for search, just in case
        check_access('/api/sales', 'GET', 200)
        
        set_permissions(['sales.create']) # Revoke sales.view
        check_access('/api/sales', 'GET', 403)

        print("\n--- Test 6: Sales Create (sales.create) ---")
        set_permissions(['sales.create', 'patients.view', 'inventory.view']) # Sales need patients/inventory usually to create
        check_access('/api/sales', 'POST', 400) # 400 = Auth Passed but Missing Data
        
        set_permissions(['sales.view']) # Revoke sales.create
        check_access('/api/sales', 'POST', 403)

        print("\n--- Test 7: Appointments Access (appointments.view) ---")
        set_permissions(['appointments.view'])
        check_access('/api/appointments', 'GET', 200)
        
        set_permissions([])
        check_access('/api/appointments', 'GET', 403)

        print("\n--- Test 8: Inventory Access (inventory.view) ---")
        set_permissions(['inventory.view'])
        check_access('/api/inventory', 'GET', 200)
        
        set_permissions([])
        check_access('/api/inventory', 'GET', 403)

        # Cleanup
        db.session.delete(user)
        db.session.delete(role)
        db.session.commit()

if __name__ == "__main__":
    verify_enforcement()
