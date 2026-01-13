
import requests
import json
import sys

BASE_URL = "http://localhost:5003"
# Use a static token or try to login. 
# Since the user provided logs showing a token, I'll try to login as admin first.
# If login fails, I'll assume I can't authenticate.

def login():
    try:
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin@x-ear.com",
            "password": "admin123"
        })
        if r.status_code == 200:
            return r.json()['data']['access_token']
        print(f"Login failed: {r.status_code} {r.text}")
        return None
    except Exception as e:
        print(f"Login connection failed: {e}") 
        # try print response text if available in e (unnlikely for request exception but useful context)
        return None

def test_endpoint(name, url, token):
    print(f"\n--- Testing {name} ({url}) ---")
    headers = {"Authorization": f"Bearer {token}"}
    try:
        r = requests.get(f"{BASE_URL}{url}", headers=headers)
        print(f"Status: {r.status_code}")
        if r.status_code == 500:
            print("ERROR RESPONSE (Partial):")
            # Print first 2000 chars of response to see traceback
            print(r.text[:2000]) 
        elif r.status_code == 200:
            print("Success (First 100 chars):", r.text[:100])
        else:
            print(f"Failed with {r.status_code}: {r.text[:200]}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    token = login()
    if not token:
        sys.exit(1)

    # Endpoints reported as 500
    test_endpoint("Inventory Stats", "/api/inventory/stats", token)
    test_endpoint("Permissions", "/api/permissions", token)
    test_endpoint("Financial Report", "/api/reports/financial", token)
    test_endpoint("Cash Records", "/api/cash-records", token) # If it exists
