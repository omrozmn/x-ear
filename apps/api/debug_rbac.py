import requests
import json

BASE_URL = "http://localhost:5003"
ADMIN_EMAIL = "admin@x-ear.com"
ADMIN_PASSWORD = "Test123!"

def debug_parties():
    # 1. Login
    print(f"Logging in as {ADMIN_EMAIL}...")
    r = requests.post(f"{BASE_URL}/api/admin/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        print(f"FAILED LOGIN: {r.status_code} {r.text}")
        return
    
    token = r.json()["data"]["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Test /api/parties (GET)
    print("\nTesting GET /api/parties ...")
    r = requests.get(f"{BASE_URL}/api/parties", headers=headers)
    print(f"STATUS: {r.status_code}")
    print(f"BODY: {json.dumps(r.json(), indent=2, ensure_ascii=False)}")
    
    # 3. Test /api/health (to verify token works)
    print("\nTesting GET /api/health with token ...")
    r = requests.get(f"{BASE_URL}/api/health", headers=headers)
    print(f"STATUS: {r.status_code}")

if __name__ == "__main__":
    debug_parties()
