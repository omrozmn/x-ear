
import requests
import json
import sys

BASE_URL = "http://localhost:5003"

def get_token():
    # Attempt Admin Login
    for pwd in ['password123', 'admin123']:
        try:
            payload = {'email': 'admin@x-ear.com', 'password': pwd}
            r = requests.post(f"{BASE_URL}/api/admin/auth/login", json=payload)
            if r.status_code == 200:
                print(f"✅ Admin login ({pwd})")
                return r.json().get('data', {}).get('token')
            else:
                print(f"Login failed ({pwd}): {r.status_code} {r.text}")
        except Exception as e:
            print(f"Login except ({pwd}): {e}")
    return None

def test_endpoints(token):
    headers = {'Authorization': f'Bearer {token}'}
    
    # 1. Payment Plan
    print("\nTesting Payment Plan...")
    sale_id = '2601040101' # Hardcoded valid sale ID from previous runs
    url = f"{BASE_URL}/api/sales/{sale_id}/payment-plan"
    payload = {
        "totalAmount": 1000,
        "planType": "installment", 
        "installmentCount": 3,
        "downPayment": 100
    }
    
    try:
        r = requests.post(url, json=payload, headers=headers)
        print(f"Status: {r.status_code}")
        try: print(json.dumps(r.json(), indent=2))
        except: print(r.text)
    except Exception as e:
        print(f"Payment Plan Error: {e}")

    # 2. Notifications (NOT NULL Issue)
    print("\nTesting Notifications POST...")
    url = f"{BASE_URL}/api/notifications"
    payload = {
        "title": "Test",
        "message": "Test Message",
        "type": "info",
        "tenant_id": "f14911c1-4347-4334-b8a4-3e460e2d1daa" # Use REAL tenant ID from create_tenant_user output
    }
    # Or try finding tenant user token:
    # ... but here we use Admin token mostly? 
    # If using Admin token, we MUST provide tenant_id.
    
    try:
        r = requests.post(url, json=payload, headers=headers)
        print(f"Status: {r.status_code}")
        try: print(json.dumps(r.json(), indent=2))
        except: print(r.text)
    except Exception as e:
        print(f"Notifications Error: {e}")

if __name__ == "__main__":
    token = get_token()
    if token:
        test_endpoints(token)
    else:
        print("Failed to get token")
