
import requests
import json
import base64
import sys

BASE_URL = "http://localhost:5003/api"

def decode_jwt_payload(token):
    try:
        # JWT is header.payload.signature
        parts = token.split('.')
        if len(parts) != 3:
            return None
        payload = parts[1]
        # Add padding if needed
        padding = len(payload) % 4
        if padding:
            payload += '=' * (4 - padding)
        decoded = base64.urlsafe_b64decode(payload).decode('utf-8')
        return json.loads(decoded)
    except Exception as e:
        print(f"Error decoding token: {e}")
        return None

def test_refresh_flow():
    print("1. Logging in...")
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "username": "admin@x-ear.com",
        "password": "admin" 
    })
    
    # Try alternate credential if first fails (common in dev envs)
    if resp.status_code != 200:
        print("   Default login failed, trying phone...")
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "username": "5453092516",
            "password": "admin333"
        })

    if resp.status_code != 200:
        print(f"FAILED: Login failed. Status: {resp.status_code}, Body: {resp.text}")
        sys.exit(1)
        
    data = resp.json()
    access_token = data.get('access_token')
    refresh_token = data.get('refreshToken') # Note: Check casing from your auth.py return
    
    print(f"   Login successful.")
    
    print("\n2. Inspecting Tokens...")
    at_payload = decode_jwt_payload(access_token)
    rt_payload = decode_jwt_payload(refresh_token)
    
    print(f"   Access Token Type:  {at_payload.get('type')}")
    print(f"   Refresh Token Type: {rt_payload.get('type')}")
    
    if rt_payload.get('type') != 'refresh':
        print("FAILED: Refresh token has wrong type! Expected 'refresh'.")
        sys.exit(1)
    else:
        print("SUCCESS: Refresh token has correct type 'refresh'.")

    print("\n3. Testing Token Refresh Endpoint...")
    headers = {"Authorization": f"Bearer {refresh_token}"}
    # Some older implementations required empty body, strictly checking header
    refresh_resp = requests.post(f"{BASE_URL}/auth/refresh", json={}, headers=headers)
    
    if refresh_resp.status_code == 200:
        new_at = refresh_resp.json().get('access_token')
        print(f"SUCCESS: Refresh endpoint accepted token. New Access Token received.")
        print(f"   New AT Preview: {new_at[:10]}...")
    else:
        print(f"FAILED: Refresh endpoint rejected token.")
        print(f"   Status: {refresh_resp.status_code}")
        print(f"   Response: {refresh_resp.text}")
        sys.exit(1)

if __name__ == "__main__":
    try:
        test_refresh_flow()
    except Exception as e:
        print(f"An error occurred: {e}")
        sys.exit(1)
