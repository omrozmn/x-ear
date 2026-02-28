#!/usr/bin/env python3
"""Test inventory endpoint response structure"""
import requests
import json

BASE_URL = "http://localhost:5003"

def test_inventory_response():
    """Test inventory endpoint returns correct response structure"""
    
    # Login first
    login_response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={
            "email": "admin@x-ear.com",
            "password": "admin123"
        }
    )
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(login_response.text)
        return False
    
    token = login_response.json()["data"]["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test admin inventory endpoint
    print("\n" + "="*60)
    print("Testing /api/admin/inventory")
    print("="*60)
    
    response = requests.get(
        f"{BASE_URL}/api/admin/inventory",
        headers=headers,
        params={"page": 1, "limit": 5}
    )
    
    print(f"\nStatus Code: {response.status_code}")
    print(f"\nResponse Headers:")
    print(f"  Content-Type: {response.headers.get('content-type')}")
    
    print(f"\nResponse Body:")
    data = response.json()
    print(json.dumps(data, indent=2, ensure_ascii=False))
    
    # Validate structure
    print("\n" + "="*60)
    print("Validation")
    print("="*60)
    
    checks = {
        "Has 'success' field": "success" in data,
        "'success' is True": data.get("success") == True,
        "Has 'data' field": "data" in data,
        "'data' is list": isinstance(data.get("data"), list),
        "Has 'meta' field": "meta" in data,
        "'meta' has pagination": data.get("meta") and "page" in data.get("meta", {}),
    }
    
    for check, result in checks.items():
        status = "✓" if result else "✗"
        print(f"{status} {check}")
    
    all_passed = all(checks.values())
    
    if all_passed:
        print("\n✅ All checks passed!")
    else:
        print("\n❌ Some checks failed!")
    
    return all_passed

if __name__ == "__main__":
    test_inventory_response()
