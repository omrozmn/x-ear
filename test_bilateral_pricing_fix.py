#!/usr/bin/env python3

import requests
import json

def test_bilateral_pricing_fix():
    """Test that bilateral sales now have correct pricing"""
    
    base_url = 'http://localhost:5003'
    
    # Use pre-generated token
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfZWFmYWFkYzYiLCJleHAiOjE3NzI1NTQ2NjksImlhdCI6MTc3MjUyNTg2OSwiYWNjZXNzLnRlbmFudF9pZCI6Ijk1NjI1NTg5LWE0YWQtNDFmZi1hOTllLTQ5NTU5NDNiYjQyMSIsInJvbGUiOiJhZG1pbiIsInRlbmFudF9pZCI6Ijk1NjI1NTg5LWE0YWQtNDFmZi1hOTllLTQ5NTU5NDNiYjQyMSJ9.1NjhOuDYmsKxvdqbzc9sjOZmnyFFttKZwmXJIVTSbFA"
    headers = {'Authorization': f'Bearer {token}'}
    
    print("🧪 TESTING BILATERAL PRICING FIX")
    print("=" * 50)
    
    # Test the existing sale 2603020114 (after our data fix)
    print("\n1️⃣ Testing existing bilateral sale (after data fix):")
    sale_response = requests.get(f'{base_url}/api/sales/2603020114', headers=headers)
    
    if sale_response.status_code != 200:
        print(f"❌ Sale API failed: {sale_response.status_code}")
        return False
        
    sale_data = sale_response.json().get('data', {})
    
    print(f"Sale-level pricing:")
    print(f"  - listPriceTotal (unit): {sale_data.get('listPriceTotal')}")
    print(f"  - unitListPrice: {sale_data.get('unitListPrice')}")
    print(f"  - actualListPriceTotal: {sale_data.get('actualListPriceTotal')}")
    print(f"  - totalAmount: {sale_data.get('totalAmount')}")
    
    devices = sale_data.get('devices', [])
    print(f"\nDevice-level pricing ({len(devices)} devices):")
    for i, device in enumerate(devices):
        print(f"  Device {i+1} ({device.get('ear')}):")
        print(f"    - listPrice: {device.get('listPrice')}")
        print(f"    - salePrice: {device.get('salePrice')}")
    
    # Verify the fix
    expected_unit_price = 10000.0
    expected_total_price = 20000.0
    
    success = True
    
    # Check sale-level prices
    if sale_data.get('unitListPrice') != expected_unit_price:
        print(f"❌ Sale unitListPrice wrong: {sale_data.get('unitListPrice')} != {expected_unit_price}")
        success = False
    else:
        print(f"✅ Sale unitListPrice correct: {expected_unit_price}")
    
    if sale_data.get('actualListPriceTotal') != expected_total_price:
        print(f"❌ Sale actualListPriceTotal wrong: {sale_data.get('actualListPriceTotal')} != {expected_total_price}")
        success = False
    else:
        print(f"✅ Sale actualListPriceTotal correct: {expected_total_price}")
    
    # Check device-level prices
    for i, device in enumerate(devices):
        device_list_price = device.get('listPrice')
        if device_list_price != expected_unit_price:
            print(f"❌ Device {i+1} listPrice wrong: {device_list_price} != {expected_unit_price}")
            success = False
        else:
            print(f"✅ Device {i+1} listPrice correct: {expected_unit_price}")
    
    if len(devices) != 2:
        print(f"❌ Expected 2 devices, found {len(devices)}")
        success = False
    else:
        print(f"✅ Correct number of devices: 2")
    
    print(f"\n{'✅ BILATERAL PRICING FIX SUCCESSFUL!' if success else '❌ BILATERAL PRICING FIX FAILED!'}")
    return success

if __name__ == "__main__":
    success = test_bilateral_pricing_fix()
    exit(0 if success else 1)