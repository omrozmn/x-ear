
import requests
from app import app
from models import User, db

def test_permissions_endpoint():
    with app.app_context():
        # Find Super Admin
        admin = User.query.filter_by(role='super_admin').first()
        if not admin:
            # Fallback to known admin email if role query fails (though it should work now)
            admin = User.query.filter_by(email='admin@x-ear.com').first()
        
        if not admin:
            print("Admin user not found for token generation")
            return

        # Use real login endpoint to get token (avoid Flask-JWT-Extended dependency)
        with app.test_client() as client:
            login = client.post(
                '/api/admin/auth/login',
                json={'email': getattr(admin, 'email', 'admin@x-ear.com'), 'password': 'admin123'},
                headers={'Content-Type': 'application/json'},
            )
            login_data = login.get_json() or {}
            if login.status_code != 200:
                print(f"Login failed: {login.status_code} - {login_data}")
                return

            token = (login_data.get('data') or {}).get('token') or (login_data.get('data') or {}).get('accessToken')
            if not token:
                print(f"Login returned no token: {login_data}")
                return

            headers = {'Authorization': f'Bearer {token}'}
            resp = client.get('/api/permissions', headers=headers)
            print(f"Status: {resp.status_code}")
            if resp.status_code == 200:
                data = resp.json
                print("Response Keys:", data.keys())
                if 'data' in data and isinstance(data['data'], list) and len(data['data']) > 0:
                     print(f"Success! Found {len(data['data'])} permission groups.")
                     print("Sample Group:", data['data'][0].get('label'))
                     # Print sample permissions to verify content
                     print("First group permissions:", data['data'][0].get('permissions', [])[:3])
                elif 'permissions' in data: # Legacy format check
                     print(f"Found 'permissions' key with {len(data['permissions'])} items.")
                else:
                     print("Response body:", data)
            else:
                print("Error:", resp.text)


if __name__ == "__main__":
    test_permissions_endpoint()
