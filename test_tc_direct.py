#!/usr/bin/env python3
"""Direct test of TC number saving without HTTP"""

import sys
sys.path.insert(0, 'apps/api')

from core.models.party import Party

# Test 1: snake_case (from Pydantic model_dump with by_alias=False)
print("Test 1: snake_case keys (Pydantic model_dump)")
data1 = {
    'first_name': 'Test',
    'last_name': 'User',
    'phone': '05551234567',
    'tc_number': '12345678901',
    'status': 'active'
}

party1 = Party.from_dict(data1)
print(f"  Input tc_number: {data1.get('tc_number')}")
print(f"  Party.tc_number: {party1.tc_number}")
print(f"  ✅ PASS" if party1.tc_number == '12345678901' else f"  ❌ FAIL")
print()

# Test 2: camelCase (from frontend)
print("Test 2: camelCase keys (Frontend)")
data2 = {
    'firstName': 'Test',
    'lastName': 'User',
    'phone': '05551234568',
    'tcNumber': '98765432109',
    'status': 'active'
}

party2 = Party.from_dict(data2)
print(f"  Input tcNumber: {data2.get('tcNumber')}")
print(f"  Party.tc_number: {party2.tc_number}")
print(f"  ✅ PASS" if party2.tc_number == '98765432109' else f"  ❌ FAIL")
print()

# Test 3: Mixed (edge case)
print("Test 3: Mixed keys")
data3 = {
    'first_name': 'Test',
    'lastName': 'User',
    'phone': '05551234569',
    'tc_number': '11111111111',
    'status': 'active'
}

party3 = Party.from_dict(data3)
print(f"  Input tc_number: {data3.get('tc_number')}")
print(f"  Party.tc_number: {party3.tc_number}")
print(f"  ✅ PASS" if party3.tc_number == '11111111111' else f"  ❌ FAIL")
print()

print("All tests completed!")
