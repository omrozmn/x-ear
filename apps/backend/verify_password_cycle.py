import requests
import json
import sys
import time

BASE_URL = "http://localhost:5003/api"

def run_test():
    print("--- Starting Password Cycle Verification ---")
    
    # Initial Credentials
    username = "admin"
    initial_password = "admin333" # Assuming this based on logs
    temp_password = "adminTestPassword123!"
    
    # 1. Login with Initial
    print(f"1. Attempting login with current password: {initial_password}")
    res = requests.post(f"{BASE_URL}/auth/login", json={"username": username, "password": initial_password})
    
    if res.status_code != 200:
        print(f"FATAL: Could not log in with '{initial_password}'. Status: {res.status_code}")
        # Try 'admin123' just in case logs misled me or user changed it
        print("   Trying 'admin123'...")
        initial_password = "admin123"
        res = requests.post(f"{BASE_URL}/auth/login", json={"username": username, "password": initial_password})
        if res.status_code != 200:
            print("   FATAL: Could not log in. Aborting.")
            return

    token = res.json().get('access_token')
    print("   Login SUCCESS.")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Change Password to Temp
    print(f"\n2. Changing password to: {temp_password}")
    payload = {
        "currentPassword": initial_password,
        "newPassword": temp_password
    }
    res_change = requests.post(f"{BASE_URL}/users/me/password", json=payload, headers=headers)
    
    if res_change.status_code == 200:
        print("   Change Password Request: SUCCESS (200 OK)")
    else:
        print(f"   Change Password Request: FAILED ({res_change.status_code})")
        print(f"   Response: {res_change.text}")
        return

    # 3. Verify Login with Temp
    print(f"\n3. Verifying login with NEW password: {temp_password}")
    res_new_login = requests.post(f"{BASE_URL}/auth/login", json={"username": username, "password": temp_password})
    
    if res_new_login.status_code == 200:
        print("   Login with NEW password: SUCCESS")
        new_token = res_new_login.json().get('access_token')
        new_headers = {"Authorization": f"Bearer {new_token}"}
    else:
        print(f"   Login with NEW password: FAILED ({res_new_login.status_code})")
        print("   CRITICAL: Password change reported success but login failed!")
        return

    # 4. Revert Password
    print(f"\n4. Reverting password back to: {initial_password}")
    revert_payload = {
        "currentPassword": temp_password,
        "newPassword": initial_password
    }
    res_revert = requests.post(f"{BASE_URL}/users/me/password", json=revert_payload, headers=new_headers)
    
    if res_revert.status_code == 200:
        print("   Revert Password: SUCCESS")
        print("\n--- TEST COMPLETE: Password update functionality is WORKING verified end-to-end. ---")
    else:
        print(f"   Revert Password: FAILED ({res_revert.status_code})")
        print("   Please manually reset password to 'admin333' if 'adminTestPassword123!' works.")

if __name__ == "__main__":
    run_test()
