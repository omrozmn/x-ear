
import requests
import sys

BASE_URL = "http://localhost:5003/api"

def test_profile_access():
    print("1. Logging in to get fresh tokens...")
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "username": "admin@x-ear.com",
        "password": "admin" 
    })
    
    if resp.status_code != 200:
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "username": "5453092516",
            "password": "admin333"
        })
    
    if resp.status_code != 200:
        print("Login failed.")
        sys.exit(1)
        
    data = resp.json()
    access_token = data.get('access_token')
    
    print("2. Attempting to access Profile Page Endpoint (/subscriptions/current)...")
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # This is the endpoint logging 401 in user's console
    sub_resp = requests.get(f"{BASE_URL}/subscriptions/current", headers=headers)
    
    if sub_resp.status_code == 200:
        print("SUCCESS: Accessed /subscriptions/current with valid token.")
        print(f"Response: {sub_resp.json()}")
    else:
        print(f"FAILED: /subscriptions/current returned {sub_resp.status_code}")
        print(f"Body: {sub_resp.text}")
        sys.exit(1)

if __name__ == "__main__":
    test_profile_access()
