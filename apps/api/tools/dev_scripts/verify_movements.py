import sys
import os
# Add backend root to path to allow imports from app, models, etc.
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
import requests
import json
import random
import string
import sys
import os

# Add backend directory to path to import app for context if needed (to create user)
# But we want to test the running API, so let's try to do everything via API if we can, 
# OR use app context just to create the user, then use requests for the rest.
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app import app, db
from models.user import User

# Configuration
BASE_URL = 'http://localhost:5003/api'

def run_test():
    with app.app_context():
        # Check if route exists in URL map
        print("Checking URL Map for inventory.movements...")
        has_route = False
        for rule in app.url_map.iter_rules():
            if 'inventory/movements' in str(rule):
                print(f"Found route: {rule} -> {rule.endpoint}")
                has_route = True
        
        if not has_route:
            print("❌ Route /inventory/movements NOT FOUND in app.url_map")
        else:
            print("✅ Route found in app.url_map")

        # 1. Create a test user directly in DB to ensure we can login
        unique_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        email = f"test_movements_{unique_id}@example.com"
        password = "password123"
        
        user = User(
            email=email,
            username=f"user_{unique_id}",
            first_name="Test",
            last_name="User",
            role="admin",
            tenant_id=f"tenant_{unique_id}"
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        print(f"Created test user: {email}")

        # 2. Login via API
        login_resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": email,
            "password": password
        })
        
        if login_resp.status_code != 200:
            print(f"Login failed: {login_resp.status_code} {login_resp.text}")
            return
            
        token = login_resp.json().get('access_token')
        headers = {'Authorization': f'Bearer {token}'}
        print("Login successful, got token.")

        # 3. Hit Inventory Movements Endpoint
        print(f"\nTesting GET {BASE_URL}/inventory/movements ...")
        resp = requests.get(f"{BASE_URL}/inventory/movements", headers=headers)
        
        print(f"Status Code: {resp.status_code}")
        try:
            data = resp.json()
            print("Response JSON:")
            print(json.dumps(data, indent=2))
        except:
            print("Response Text:", resp.text)

        # 4. Hit Specific Inventory Items (to trigger 404 if route missing)
        # We don't have an item yet, but getting the list is consistent
        if resp.status_code == 200:
            print("\n✅ /api/inventory/movements is accessible!")
        else:
            print("\n❌ Failed to access movements endpoint.")

        # Cleanup
        db.session.delete(user)
        db.session.commit()
        print("\nTest user deleted.")

if __name__ == "__main__":
    run_test()
