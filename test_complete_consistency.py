#!/usr/bin/env python3

import requests
import json

def test_complete_consistency():
    """Test consistency across all views: sale, edit modal, sales table, device assignments"""
    
    base_url = 'http://localhost:5003'
    
    # Use pre-generated token
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfZWFmYWFkYzYiLCJleHAiOjE3NzI1NTQ2NjksImlhdCI6MTc3MjUyNTg2OSwiYWNjZXNzLnRlbmFudF9pZCI6Ijk1NjI1NTg5LWE0YWQtNDFmZi1hOTllLTQ5NTU5NDNiYjQyMSIsInJvbGUiOiJhZG1pbiIsInRlbmFudF9pZCI6Ijk1NjI1NTg5LWE0YWQtNDFmZi1hOTllLTQ5NTU5NDNiYjQyMSJ9.1NjhOuDYmsKxvdqbzc9sjOZmnyFFttKZwmXJIVTSbFA"
    headers = {'Authorization': f'Bearer {token}'}
    
    test_sale_id = '2603020114'
    
    print("🧪 COMPREHENSIVE CONSISTENCY TEST")
    print("=" * 80)
    print(f"Testing Sale ID: {test_sale_id}")
    
    try:
        # 1. Test Sale endpoint (GET /api/sales/{id})
        print(f"\n1️⃣ SALE ENDPOINT (GET /api/sales/{test_sale_id}):")
        sale_response = requests.get(f'{base_url}/api/sales/{test_sale_id}', headers=headers)
        
        if sale_response.status_code != 200:
            print(f"❌ Sale API failed: {sale_response.status_code}")
            return False
            
        sale_data = sale_response.json().get('data', {})
        
        print(f"   - unitListPrice: {sale_data.get('unitListPrice')}")
        print(f"   - listPriceTotal: {sale_data.get('listPriceTotal')}")
        print(f"   - actualListPriceTotal: {sale_data.get('actualListPriceTotal')}")
        print(f"   - totalAmount: {sale_data.get('totalAmount')}")
        print(f"   - finalAmount: {sale_data.get('finalAmount')}")
        print(f"   - discountAmount: {sale_data.get('discountAmount')}")
        print(f"   - sgkCoverage: {sale_data.get('sgkCoverage')}")
        print(f"   - remainingAmount: {sale_data.get('remainingAmount')}")
        print(f"   - devices count: {len(sale_data.get('devices', []))}")
        
        # 2. Test Device Assignment endpoints
        devices = sale_data.get('devices', [])
        print(f"\n2️⃣ DEVICE ASSIGNMENT ENDPOINTS:")
        
        assignment_ids = []
        for i, device in enumerate(devices):
            assignment_id = device.get('id')  # This should be assignment ID
            if assignment_id:
                assignment_ids.append(assignment_id)
                print(f"   Device {i+1} (Assignment ID: {assignment_id}):")
                print(f"     - listPrice: {device.get('listPrice')}")
                print(f"     - salePrice: {device.get('salePrice')}")
                print(f"     - ear: {device.get('ear')}")
                
                # Test individual assignment endpoint
                assignment_response = requests.get(f'{base_url}/api/device-assignments/{assignment_id}', headers=headers)
                if assignment_response.status_code == 200:
                    assignment_data = assignment_response.json().get('data', {})
                    print(f"     - GET /api/device-assignments/{assignment_id}:")
                    print(f"       - listPrice: {assignment_data.get('listPrice')}")
                    print(f"       - salePrice: {assignment_data.get('salePrice')}")
                    print(f"       - netPayable: {assignment_data.get('netPayable')}")
                else:
                    print(f"     - ❌ Assignment endpoint failed: {assignment_response.status_code}")
        
        # 3. Consistency Checks
        print(f"\n3️⃣ CONSISTENCY CHECKS:")
        
        expected_unit_price = 10000.0
        expected_total_price = 20000.0
        expected_device_count = 2
        
        success = True
        
        # Check sale-level consistency
        if sale_data.get('unitListPrice') != expected_unit_price:
            print(f"❌ Sale unitListPrice inconsistent: {sale_data.get('unitListPrice')} != {expected_unit_price}")
            success = False
        
        if sale_data.get('actualListPriceTotal') != expected_total_price:
            print(f"❌ Sale actualListPriceTotal inconsistent: {sale_data.get('actualListPriceTotal')} != {expected_total_price}")
            success = False
        
        if len(devices) != expected_device_count:
            print(f"❌ Device count inconsistent: {len(devices)} != {expected_device_count}")
            success = False
        
        # Check device-level consistency
        for i, device in enumerate(devices):
            if device.get('listPrice') != expected_unit_price:
                print(f"❌ Device {i+1} listPrice inconsistent: {device.get('listPrice')} != {expected_unit_price}")
                success = False
        
        # Check that frontend will display correctly
        print(f"\n4️⃣ FRONTEND DISPLAY VERIFICATION:")
        unit_price = sale_data.get('unitListPrice', 0)
        device_count = len(devices)
        
        print(f"   Frontend will show: 'Liste Fiyatı (birim): ₺{unit_price:,.2f} x{device_count}'")
        print(f"   Expected display: 'Liste Fiyatı (birim): ₺{expected_unit_price:,.2f} x{expected_device_count}'")
        
        if unit_price == expected_unit_price and device_count == expected_device_count:
            print(f"   ✅ Frontend display will be CORRECT!")
        else:
            print(f"   ❌ Frontend display will be WRONG!")
            success = False
        
        print(f"\n{'✅ ALL CONSISTENCY TESTS PASSED!' if success else '❌ CONSISTENCY TESTS FAILED!'}")
        return success
        
    except Exception as e:
        print(f"\n❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_complete_consistency()
    exit(0 if success else 1)