#!/usr/bin/env python3

import requests
import json
import subprocess

# Get token
result = subprocess.run(['python', 'gen_token_deneme.py'], capture_output=True, text=True, cwd='.')
token = result.stdout.strip()

API_URL = "http://localhost:5003"

# Test the schema directly
payload = {
    "downPayment": 5000
}

print("🔍 Testing DeviceAssignmentUpdate schema...")
print(f"Payload: {json.dumps(payload, indent=2)}")

# Make the request
response = requests.patch(
    f"{API_URL}/api/device-assignments/assign_4f3f8639",
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Idempotency-Key": f"test-debug-{hash(str(payload))}"
    },
    json=payload
)

print(f"\nResponse Status: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")

# Check if the field was processed
if response.status_code == 200:
    data = response.json().get('data', {})
    down_payment = data.get('downPayment', 'NOT_FOUND')
    print(f"\nDown payment in response: {down_payment}")
else:
    print(f"Error: {response.text}")