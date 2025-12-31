import requests
import json
import sys

BASE_URL = "http://localhost:5003/api"

def run_test():
    print("--- Starting Verification ---")
    
    # 1. Login
    print("1. Logging in as admin...")
    login_payload = {"username": "admin", "password": "wrongpassword"} # Intentionally wrong first to see if login works
    # Actually I need the real password to get a token. 
    # Based on logs, admin/admin333 worked.
    
    # Try logging in with 'admin333'
    login_payload = {"username": "admin", "password": "admin333"}
    try:
        res = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
        if res.status_code != 200:
            print(f"Login failed: {res.status_code} {res.text}")
            # Try with 'admin123' just in case or skip
            login_payload["password"] = "admin123"
            res = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
            if res.status_code != 200:
                print("Could not log in to testing account. Aborting verification script.")
                return
        
        token = res.json().get('access_token')
        print("Login successful. Token obtained.")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Try changing password with WRONG old password
        print("\n2. Testing Change Password with WRONG old password...")
        # Current: admin333 (presumably), trying to change to 'newpass123' providing 'wrongold'
        change_payload = {
            "currentPassword": "WRONG_PASSWORD_123",
            "newPassword": "new_secure_password"
        }
        
        res_change = requests.post(f"{BASE_URL}/users/me/password", json=change_payload, headers=headers)
        
        print(f"Status Code: {res_change.status_code}")
        print(f"Response: {res_change.text}")
        
        if res_change.status_code == 403:
            print("SUCCESS: Received 403 Forbidden as expected for wrong password.")
        elif res_change.status_code == 401:
            print("FAILURE: Received 401 Unauthorized - This triggers the frontend interceptor bug!")
        else:
            print(f"Unexpected status: {res_change.status_code}")

    except Exception as e:
        print(f"Exception during test: {e}")

if __name__ == "__main__":
    run_test()
