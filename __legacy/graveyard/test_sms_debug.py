import requests
import json

base_url = "http://localhost:5003/api"

# 1. Login
print("Logging in...")
resp = requests.post(f"{base_url}/auth/login", json={"username": "admin@x-ear.com", "password": "admin123"})
if resp.status_code != 200:
    print("Login failed:", resp.text)
    exit(1)

data = resp.json()
token = data.get("access_token")
print("Login successful. Token obtained.")

# 2. Send OTP
print("Sending OTP...")
headers = {"Authorization": f"Bearer {token}"}
resp = requests.post(f"{base_url}/auth/send-verification-otp", json={"phone": "5453092516"}, headers=headers)

print(f"Status Code: {resp.status_code}")
print("Response:", resp.text)
