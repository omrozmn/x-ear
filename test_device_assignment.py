#!/usr/bin/env python3
"""Test device assignment endpoint directly"""
import requests
import json
import time

# Test data
party_id = "pat_test"
url = f"http://localhost:5003/api/parties/{party_id}/device-assignments"

headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfMDNhZjc1MTkiLCJleHAiOjE3NzA1MjIyMTEsImlhdCI6MTc3MDQ5MzQxMSwidGVuYW50X2lkIjoidGVuYW50XzAwMSIsInJvbGUiOiJBRE1JTiIsInJvbGVfcGVybWlzc2lvbnMiOlsiKiJdLCJwZXJtX3ZlciI6MSwiaXNfYWRtaW4iOmZhbHNlfQ.xTEmTcuEzybUKYFw3j5-vs9YoBM8tkia_CdbDPfvNis",
    "Idempotency-Key": f"test-{int(time.time() * 1000)}"
}

data = {
    "deviceAssignments": [
        {
            "inventoryId": "inv_test_001",
            "ear": "right",
            "serialNumber": "TEST-SN-12345",
            "reason": "Sale",
            "paymentMethod": "cash"
        }
    ],
    "paymentPlan": "cash"
}

print("Sending request to:", url)
print("Data:", json.dumps(data, indent=2))

try:
    response = requests.post(url, json=data, headers=headers, timeout=5)
    print(f"\nStatus Code: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    print(f"Response Text: {response.text}")
    
    if response.status_code != 200:
        try:
            error_data = response.json()
            print(f"Error JSON: {json.dumps(error_data, indent=2)}")
        except:
            print("Could not parse error as JSON")
except requests.exceptions.RequestException as e:
    print(f"Request failed: {e}")
