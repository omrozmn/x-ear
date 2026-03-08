#!/usr/bin/env python3

import requests

def test_api_response():
    """Test what the API actually returns for sale 2603020114"""
    
    base_url = 'http://localhost:5003'
    
    # Use pre-generated token
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfZWFmYWFkYzYiLCJleHAiOjE3NzI1NTQ2NjksImlhdCI6MTc3MjUyNTg2OSwiYWNjZXNzLnRlbmFudF9pZCI6Ijk1NjI1NTg5LWE0YWQtNDFmZi1hOTllLTQ5NTU5NDNiYjQyMSIsInJvbGUiOiJhZG1pbiIsInRlbmFudF9pZCI6Ijk1NjI1NTg5LWE0YWQtNDFmZi1hOTllLTQ5NTU5NDNiYjQyMSJ9.1NjhOuDYmsKxvdqbzc9sjOZmnyFFttKZwmXJIVTSbFA"
    headers = {'Authorization': f'Bearer {token}'}
    
    # Test sale endpoint
    sale_response = requests.get(f'{base_url}/api/sales/2603020114', headers=headers)
    
    if sale_response.status_code != 200:
        print(f"❌ Sale API failed: {sale_response.status_code}")
        print(sale_response.text)
        return
        
    sale_data = sale_response.json().get('data', {})
    
    print("🔍 SALE API RESPONSE:")
    print(f"  - listPriceTotal: {sale_data.get('listPriceTotal')}")
    print(f"  - unitListPrice: {sale_data.get('unitListPrice')}")
    print(f"  - actualListPriceTotal: {sale_data.get('actualListPriceTotal')}")
    print(f"  - totalAmount: {sale_data.get('totalAmount')}")
    print(f"  - devices count: {len(sale_data.get('devices', []))}")
    print()
    
    # Check device data
    devices = sale_data.get('devices', [])
    for i, device in enumerate(devices):
        print(f"Device {i+1}:")
        print(f"  - listPrice: {device.get('listPrice')}")
        print(f"  - salePrice: {device.get('salePrice')}")
        print(f"  - ear: {device.get('ear')}")
        print()
    
    # Test device assignment endpoint
    assignments = sale_data.get('devices', [])
    if assignments:
        assignment_id = assignments[0].get('assignmentId')
        if assignment_id:
            assignment_response = requests.get(f'{base_url}/api/device-assignments/{assignment_id}', headers=headers)
            
            if assignment_response.status_code == 200:
                assignment_data = assignment_response.json().get('data', {})
                print("🔍 DEVICE ASSIGNMENT API RESPONSE:")
                print(f"  - listPrice: {assignment_data.get('listPrice')}")
                print(f"  - salePrice: {assignment_data.get('salePrice')}")
                print(f"  - netPayable: {assignment_data.get('netPayable')}")
                print()

if __name__ == "__main__":
    test_api_response()