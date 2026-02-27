#!/usr/bin/env python3
"""Test inventory schema validation"""

import sys
sys.path.insert(0, 'apps/api')

from schemas.inventory import InventoryItemCreate
from pydantic import ValidationError

# Test data similar to what frontend sends
test_data = {
    'name': 'Test Item',
    'brand': 'Test Brand',
    'category': 'hearing_aid',
    'availableInventory': 10,
    'reorderLevel': 5,
    'price': 100.0,
    'supplier': 'Test Supplier'
}

print("Testing InventoryItemCreate schema validation...")
print(f"Input data: {test_data}")
print()

try:
    item = InventoryItemCreate(**test_data)
    print('✅ Schema validation passed')
    print(f'Category value: {item.category}')
    print(f'Model dump (by_alias=False): {item.model_dump(by_alias=False)}')
    print(f'Model dump (by_alias=True): {item.model_dump(by_alias=True)}')
except ValidationError as e:
    print('❌ Schema validation failed:')
    print(e)
