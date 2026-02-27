#!/usr/bin/env python3
"""Test inventory creation with frontend-like data"""

import sys
import os
sys.path.insert(0, 'apps/api')

# Set environment variables
os.environ['DATABASE_URL'] = 'postgresql://postgres:postgres@localhost:5432/xear_dev'
os.environ['JWT_SECRET'] = 'test-secret-key-for-testing-only'

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.models.inventory import InventoryItem
from schemas.inventory import InventoryItemCreate
import json

# Create test database session
engine = create_engine(os.environ['DATABASE_URL'])
Session = sessionmaker(bind=engine)
db = Session()

# Test data that mimics what frontend sends
frontend_data = {
    'name': 'Test Hearing Aid',
    'brand': 'Phonak',
    'category': 'hearing_aid',
    'model': 'Audeo P90',
    'availableInventory': 10,
    'reorderLevel': 5,
    'price': 15000.0,
    'cost': 10000.0,
    'supplier': 'Test Supplier',
    'unit': 'adet',
    'description': 'Test description',
    'features': ['bluetooth', 'rechargeable'],
    'availableSerials': ['SN001', 'SN002', 'SN003'],
    'warranty': 24,
    'vatRate': 20.0,
    'priceIncludesKdv': False,
    'costIncludesKdv': False
}

print("=" * 80)
print("TEST: Frontend Inventory Creation")
print("=" * 80)
print(f"\n1. Frontend sends data (camelCase):")
print(json.dumps(frontend_data, indent=2))

# Step 1: Validate with Pydantic schema
print(f"\n2. Pydantic schema validation:")
try:
    item_schema = InventoryItemCreate(**frontend_data)
    print("✅ Schema validation passed")
    print(f"   Category: {item_schema.category}")
except Exception as e:
    print(f"❌ Schema validation failed: {e}")
    sys.exit(1)

# Step 2: Convert to dict (what router does)
print(f"\n3. Convert to dict (by_alias=False):")
data = item_schema.model_dump(exclude_unset=True, by_alias=False)
print(f"   Keys: {list(data.keys())}")
print(f"   Category: {data.get('category')}")

# Step 3: Extract serials
serials = data.pop('available_serials', [])
data.pop('tenant_id', None)
print(f"\n4. After popping serials and tenant_id:")
print(f"   Keys: {list(data.keys())}")
print(f"   Category: {data.get('category')}")
print(f"   Serials: {serials}")

# Step 4: Create model instance
print(f"\n5. Create InventoryItem model:")
try:
    # Add required fields
    data['id'] = 'test_item_001'
    tenant_id = '95625589-a4ad-41ff-a99e-4955943bb421'  # Test tenant
    
    print(f"   Creating with tenant_id={tenant_id}")
    print(f"   Data keys: {list(data.keys())}")
    
    item = InventoryItem(tenant_id=tenant_id, **data)
    print(f"✅ Model instance created")
    print(f"   item.category = {item.category}")
    print(f"   item.name = {item.name}")
    print(f"   item.brand = {item.brand}")
    print(f"   item.supplier = {item.supplier}")
    
    # Try to add to database (rollback after)
    print(f"\n6. Test database insertion:")
    db.add(item)
    db.flush()  # Flush to catch any DB errors
    print(f"✅ Database flush successful")
    print(f"   DB item.category = {item.category}")
    
    # Add serials
    if serials:
        print(f"\n7. Adding serial numbers:")
        for s in serials:
            item.add_serial_number(s)
        print(f"✅ Serials added: {serials}")
    
    # Rollback (don't actually save)
    db.rollback()
    print(f"\n✅ TEST PASSED - All operations successful")
    
except Exception as e:
    db.rollback()
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    db.close()

print("\n" + "=" * 80)
