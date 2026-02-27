#!/usr/bin/env python3
"""
Quick Schemathesis test for fixed endpoints only
"""
import schemathesis
import requests

# Get auth token
response = requests.post(
    "http://localhost:5003/api/admin/auth/login",
    json={"email": "admin@x-ear.com", "password": "admin123"}
)
token = response.json()["data"]["token"]

# Load schema
schema = schemathesis.from_uri(
    "http://localhost:5003/openapi.json",
    headers={"Authorization": f"Bearer {token}"}
)

# Test only fixed endpoints
fixed_endpoints = [
    "/api/activity-logs",
    "/api/audit",
    "/api/settings",
    "/api/devices",
    "/api/devices/low-stock",
    "/api/sms/headers",
    "/api/sms/admin/headers",
    "/api/invoices",
]

print("=" * 60)
print("  SCHEMATHESIS TEST - Fixed Endpoints Only")
print("=" * 60)
print()

total_tests = 0
passed_tests = 0
failed_tests = 0

for endpoint in fixed_endpoints:
    print(f"Testing: {endpoint}")
    
    # Get the operation
    try:
        # Test GET operations only
        operation = schema[endpoint]["GET"]
        
        # Run limited tests (max 5 examples per endpoint)
        @schemathesis.check
        def check_response(response, case):
            assert response.status_code < 500, f"Server error: {response.status_code}"
        
        state = operation.as_state_machine()
        results = []
        
        for i, case in enumerate(operation.get_strategies()[0].example() for _ in range(5)):
            try:
                response = case.call(headers={"Authorization": f"Bearer {token}"})
                total_tests += 1
                
                if response.status_code < 500:
                    passed_tests += 1
                    print(f"  ✓ Test {i+1}: HTTP {response.status_code}")
                else:
                    failed_tests += 1
                    print(f"  ✗ Test {i+1}: HTTP {response.status_code}")
            except Exception as e:
                failed_tests += 1
                total_tests += 1
                print(f"  ✗ Test {i+1}: {str(e)[:50]}")
        
        print()
        
    except KeyError:
        print(f"  ⊘ Endpoint not found in schema")
        print()
    except Exception as e:
        print(f"  ⊘ Error: {str(e)[:50]}")
        print()

print("=" * 60)
print(f"Total: {total_tests} | Passed: {passed_tests} | Failed: {failed_tests}")
print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "N/A")
print("=" * 60)
