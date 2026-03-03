#!/usr/bin/env python3

import requests
import json
import sys
import os

# Add the API directory to Python path
sys.path.append('apps/api')

from schemas.sales import DeviceAssignmentUpdate

def test_pydantic_serialization():
    """Test how Pydantic serializes the down_payment field"""
    print("🧪 Testing Pydantic DeviceAssignmentUpdate serialization")
    
    # Create update object with downPayment
    update_data = {
        "downPayment": 5000,
        "notes": "Test down payment"
    }
    
    try:
        # Create Pydantic model
        update = DeviceAssignmentUpdate(**update_data)
        print(f"✅ Created Pydantic model: {update}")
        
        # Test different serialization methods
        print("\n📊 Serialization tests:")
        
        # Method 1: model_dump() default
        dump_default = update.model_dump(exclude_unset=True)
        print(f"1. model_dump(exclude_unset=True): {dump_default}")
        
        # Method 2: model_dump(by_alias=True)
        dump_alias = update.model_dump(exclude_unset=True, by_alias=True)
        print(f"2. model_dump(exclude_unset=True, by_alias=True): {dump_alias}")
        
        # Method 3: Check field access
        print(f"3. Direct field access: update.down_payment = {update.down_payment}")
        
        # Method 4: Check what keys are available
        print(f"4. Available keys in dump_default: {list(dump_default.keys())}")
        print(f"5. Available keys in dump_alias: {list(dump_alias.keys())}")
        
        # Method 5: Check both possible keys
        down_payment_snake = dump_default.get('down_payment')
        down_payment_camel = dump_alias.get('downPayment')
        print(f"6. down_payment (snake_case): {down_payment_snake}")
        print(f"7. downPayment (camelCase): {down_payment_camel}")
        
        return dump_alias
        
    except Exception as e:
        print(f"❌ Pydantic test failed: {e}")
        return None

def test_api_call():
    """Test actual API call to see what happens"""
    print("\n🌐 Testing actual API call")
    
    # Get token
    try:
        result = os.popen('python3 get_token.py').read().strip()
        if not result:
            print("❌ Failed to get token")
            return
        token = result
        print(f"✅ Got token: {token[:20]}...")
    except Exception as e:
        print(f"❌ Token error: {e}")
        return
    
    # Try to find an existing device assignment to test with
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Get sales to find a device assignment
    try:
        response = requests.get('http://localhost:5003/api/sales', headers=headers)
        if response.status_code == 200:
            sales_data = response.json()
            sales = sales_data.get('data', [])
            
            if sales:
                # Find first sale with device assignments
                for sale in sales:
                    device_assignments = sale.get('deviceAssignments', [])
                    if device_assignments:
                        assignment_id = device_assignments[0]['id']
                        sale_id = sale['id']
                        print(f"✅ Found test assignment: {assignment_id} in sale: {sale_id}")
                        
                        # Test the update
                        update_data = {
                            "downPayment": 7777,
                            "notes": "Debug test - down payment sync"
                        }
                        
                        print(f"📤 Sending update: {json.dumps(update_data, indent=2)}")
                        
                        update_response = requests.patch(
                            f'http://localhost:5003/api/device-assignments/{assignment_id}',
                            headers=headers,
                            json=update_data
                        )
                        
                        print(f"📥 Response status: {update_response.status_code}")
                        print(f"📥 Response body: {update_response.text}")
                        
                        if update_response.status_code == 200:
                            # Check if sale was updated
                            sale_response = requests.get(f'http://localhost:5003/api/sales/{sale_id}', headers=headers)
                            if sale_response.status_code == 200:
                                sale_data = sale_response.json()
                                paid_amount = sale_data.get('data', {}).get('paidAmount')
                                print(f"💰 Sale paid_amount after update: {paid_amount}")
                                
                                if str(paid_amount) == "7777":
                                    print("✅ Down payment sync WORKED!")
                                else:
                                    print(f"❌ Down payment sync FAILED - expected 7777, got {paid_amount}")
                            else:
                                print(f"❌ Failed to get updated sale: {sale_response.status_code}")
                        else:
                            print(f"❌ Update failed: {update_response.text}")
                        
                        return
                        
            print("❌ No sales with device assignments found")
        else:
            print(f"❌ Failed to get sales: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ API test failed: {e}")

if __name__ == "__main__":
    # Test 1: Pydantic serialization
    serialized_data = test_pydantic_serialization()
    
    # Test 2: Actual API call
    test_api_call()