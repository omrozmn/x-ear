import sys
import os

# Add apps/api to path to import core.security
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'apps/api')))

from core.security import create_access_token
import requests

token = create_access_token(
    data={"sub": "testuser", "tenant_id": "ten_12345"}
)

print(f"Token: {token}")

headers = {"Authorization": f"Bearer {token}"}
response = requests.get("http://localhost:5003/api/ai/status", headers=headers)

print(f"Status Code: {response.status_code}")
print("Response JSON:")
try:
    print(response.json())
except Exception:
    print("Not JSON:", response.text)
