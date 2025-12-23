
import requests
import json
import base64
import hmac
import hashlib
from datetime import datetime

# Config
BASE_URL = "http://localhost:5001" 
# Assuming backend runs on 5001 or 5000. 
# From previous prompt output "python app.py" is running.
# Let's assume standard port or check.

LOGIN_URL = f"{BASE_URL}/api/auth/login"
INITIATE_URL = f"{BASE_URL}/api/payments/pos/paytr/initiate"
CALLBACK_URL = f"{BASE_URL}/api/payments/pos/paytr/callback"
CONFIG_URL = f"{BASE_URL}/api/payments/pos/paytr/config"

MERCHANT_KEY = "test_key"
MERCHANT_SALT = "test_salt"
MERCHANT_ID = "test_id"

def get_token():
    # Login as admin or seeded user
    payload = {"email": "admin@xear.com", "password": "admin"}
    try:
        r = requests.post(LOGIN_URL, json=payload)
        if r.status_code == 200:
            return r.json()['access_token']
        print(f"Login failed: {r.text}")
        return None
    except Exception as e:
        print(f"Connection failed: {e}")
        return None

def setup_config(token):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "merchant_id": MERCHANT_ID,
        "merchant_key": MERCHANT_KEY,
        "merchant_salt": MERCHANT_SALT,
        "test_mode": True,
        "enabled": True
    }
    r = requests.put(CONFIG_URL, json=payload, headers=headers)
    print(f"Config Update: {r.status_code} - {r.text}")

def test_initiate_standalone(token):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "amount": 100.0,
        "description": "Standalone Test Payment",
        "installment_count": 1
    }
    r = requests.post(INITIATE_URL, json=payload, headers=headers)
    print(f"Initiate Standalone: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        print(f"Token: {data.get('token')}")
        return data.get('payment_record_id'), data.get('token') # Token used for hash calc
    else:
        print(f"Error: {r.text}")
        return None, None

def test_callback(record_id, paytr_token):
    # Simulate PayTR Callback
    # Hash calculation: merchant_oid + merchant_salt + status + total_amount
    
    # We need the transaction ID (merchant_oid). The backend generated it but didn't return it directly 
    # (it returned payment_record_id).
    # However, for the test we need the OID that was sent to generate_token.
    # The initiate response doesn't return OID. 
    # BUT we can query the DB or just make the backend return it for debug?
    # Or strict: we can't guess it.
    
    # Wait, in initiate_paytr_payment, we gen_id("ptr").
    # For this test script to work without DB access, we need OID.
    # I'll rely on the manual test output or just assume success if initiate returns 200.
    
    print("Callback test requires merchant_oid which is internal.")
    return

if __name__ == "__main__":
    token = get_token()
    if token:
        setup_config(token)
        rid, p_token = test_initiate_standalone(token)
