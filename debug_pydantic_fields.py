#!/usr/bin/env python3

# Test Pydantic model serialization directly
import sys
sys.path.append('apps/api')

from schemas.sales import DeviceAssignmentUpdate

# Create a model instance
update_data = DeviceAssignmentUpdate(downPayment=5000)

print("🔍 Testing Pydantic DeviceAssignmentUpdate serialization...")
print(f"Model instance: {update_data}")
print(f"Model fields: {update_data.model_fields.keys()}")

# Test different serialization methods
print("\n1. model_dump(exclude_unset=True, by_alias=False):")
data1 = update_data.model_dump(exclude_unset=True, by_alias=False)
print(f"   Result: {data1}")
print(f"   'down_payment' in data: {'down_payment' in data1}")
print(f"   'downPayment' in data: {'downPayment' in data1}")

print("\n2. model_dump(exclude_unset=True, by_alias=True):")
data2 = update_data.model_dump(exclude_unset=True, by_alias=True)
print(f"   Result: {data2}")
print(f"   'down_payment' in data: {'down_payment' in data2}")
print(f"   'downPayment' in data: {'downPayment' in data2}")

print("\n3. model_dump(exclude_unset=False, by_alias=True):")
data3 = update_data.model_dump(exclude_unset=False, by_alias=True)
print(f"   Result: {data3}")
print(f"   'downPayment' in data: {'downPayment' in data3}")

print("\n4. model_dump(exclude_unset=False, by_alias=False):")
data4 = update_data.model_dump(exclude_unset=False, by_alias=False)
print(f"   Result: {data4}")
print(f"   'down_payment' in data: {'down_payment' in data4}")

# Test with None value
print("\n5. Testing with None value:")
update_none = DeviceAssignmentUpdate()
data5 = update_none.model_dump(exclude_unset=True, by_alias=True)
print(f"   Result: {data5}")
print(f"   'downPayment' in data: {'downPayment' in data5}")