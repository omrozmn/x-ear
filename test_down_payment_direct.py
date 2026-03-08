#!/usr/bin/env python3

import sys
import os
import json
import logging

# Suppress logging
logging.getLogger().setLevel(logging.CRITICAL)
os.environ['SQLALCHEMY_ECHO'] = 'false'

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps/api'))

from schemas.sales import DeviceAssignmentUpdate

def test_down_payment_field_mapping():
    """Test the exact field mapping issue in DeviceAssignmentUpdate"""
    print("🧪 Testing DeviceAssignmentUpdate field mapping for down_payment")
    
    # Test data that would come from frontend
    frontend_data = {
        "downPayment": 5000,  # Frontend sends camelCase
        "notes": "Test down payment sync"
    }
    
    print(f"📤 Frontend data: {json.dumps(frontend_data, indent=2)}")
    
    try:
        # Create Pydantic model (this is what happens in the API endpoint)
        update = DeviceAssignmentUpdate(**frontend_data)
        print("✅ Pydantic model created successfully")
        print(f"   down_payment field value: {update.down_payment}")
        
        # Test serialization methods (this is what happens in the endpoint)
        data_default = update.model_dump(exclude_unset=True)
        data_alias = update.model_dump(exclude_unset=True, by_alias=True)
        
        print("\n📊 Serialization results:")
        print("1. model_dump(exclude_unset=True):")
        print(f"   Keys: {list(data_default.keys())}")
        print(f"   down_payment value: {data_default.get('down_payment', 'NOT_FOUND')}")
        
        print("\n2. model_dump(exclude_unset=True, by_alias=True):")
        print(f"   Keys: {list(data_alias.keys())}")
        print(f"   downPayment value: {data_alias.get('downPayment', 'NOT_FOUND')}")
        
        # This is the exact code from the endpoint
        data = update.model_dump(exclude_unset=True, by_alias=True)
        down_payment_value = data.get('downPayment')
        
        print("\n🔍 Endpoint simulation:")
        print(f"   data.get('downPayment'): {down_payment_value}")
        print(f"   Type: {type(down_payment_value)}")
        
        if down_payment_value is not None:
            try:
                down_val = float(down_payment_value)
                print(f"   ✅ Successfully converted to float: {down_val}")
                if down_val >= 0:
                    print("   ✅ Value is valid (>= 0)")
                    print(f"   🎯 This should sync to sale.paid_amount = {down_val}")
                else:
                    print(f"   ❌ Value is negative: {down_val}")
            except Exception as e:
                print(f"   ❌ Failed to convert to float: {e}")
        else:
            print("   ❌ downPayment not found in data")
            
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

def check_backend_logs():
    """Check what the backend is actually logging"""
    print("\n🔍 Checking backend endpoint logic...")
    
    # Simulate the exact endpoint code
    frontend_data = {"downPayment": 5000, "notes": "Test"}
    update = DeviceAssignmentUpdate(**frontend_data)
    data = update.model_dump(exclude_unset=True, by_alias=True)
    
    print("📝 Simulated endpoint log:")
    print(f"   UPDATE PAYLOAD: {json.dumps(data, default=str)}")
    print(f"   DOWN_PAYMENT CHECK: 'down_payment' in data = {'down_payment' in data}")
    print(f"   DOWN_PAYMENT CHECK: 'downPayment' in data = {'downPayment' in data}")
    print(f"   down_payment value = {data.get('down_payment', 'NOT_FOUND')}")
    print(f"   downPayment value = {data.get('downPayment', 'NOT_FOUND')}")
    
    # Check the sync logic
    down_payment_value = data.get('downPayment')
    if down_payment_value is not None:
        print(f"   ✅ Found downPayment: {down_payment_value}")
        print(f"   🔄 Would sync to sale.paid_amount = {float(down_payment_value)}")
    else:
        print("   ❌ downPayment not found - sync would NOT happen")

if __name__ == "__main__":
    success = test_down_payment_field_mapping()
    check_backend_logs()
    
    if success:
        print("\n🎉 Field mapping test PASSED - down payment sync should work")
    else:
        print("\n❌ Field mapping test FAILED")