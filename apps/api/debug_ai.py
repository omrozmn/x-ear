import requests
import json

BASE_URL = "http://localhost:5003"
ADMIN_EMAIL = "admin@x-ear.com"
ADMIN_PASSWORD = "Test123!"

def debug_ai():
    # 1. Login
    print(f"Logging in as {ADMIN_EMAIL}...")
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        print(f"FAILED LOGIN: {r.status_code} {r.text}")
        return
    
    token = r.json()["data"]["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Test /api/ai/composer/autocomplete
    print("\nTesting GET /api/ai/composer/autocomplete ...")
    params = {"q": "test"}
    r = requests.get(f"{BASE_URL}/api/ai/composer/autocomplete", headers=headers, params=params)
    print(f"STATUS: {r.status_code}")
    print(f"BODY: {json.dumps(r.json(), indent=2, ensure_ascii=False)}")

if __name__ == "__main__":
    debug_ai()
