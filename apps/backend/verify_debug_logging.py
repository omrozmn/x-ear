
import requests
import sys

BASE_URL = "http://localhost:5003/api"

def test_logging():
    print("Sending dummy refresh request...")
    headers = {"Authorization": "Bearer dummy.token.payload"}
    try:
        resp = requests.post(f"{BASE_URL}/auth/refresh", json={}, headers=headers)
        print(f"Response Code: {resp.status_code}")
        # We expect 500 or 401 because the token is invalid, but the logs should show our message.
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_logging()
