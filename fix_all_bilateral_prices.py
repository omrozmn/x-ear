#!/usr/bin/env python3
"""
Fix all bilateral sales with incorrect device assignment prices
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps/api'))

from core.database import SessionLocal
from core.models import Sale, DeviceAssignment
from decimal import Decimal

db = SessionLocal()

try:
    # Find all bilateral sales (2 device assignments)
    all_sales = db.query(Sale).all()
    
    fixed_count = 0
    
    for sale in all_sales:
        assignments = db.query(DeviceAssignment).filter_by(sale_id=sale.id).all()
        
        if len(assignments) == 2:  # Bilateral sale
            # Check if prices are wrong (divided by 2)
            unit_price = float(sale.unit_list_price or 0)
            current_price = float(assignments[0].list_price or 0)
            
            # If current price is half of unit price, it's wrong
            if abs(current_price - (unit_price / 2)) < 0.01 and unit_price > 0:
                print(f"\n🔧 Fixing sale {sale.id}:")
                print(f"   Current device prices: {current_price}")
                print(f"   Should be: {unit_price}")
                
                # Fix both device assignments
                for assignment in assignments:
                    assignment.list_price = Decimal(str(unit_price))
                    assignment.sale_price = Decimal(str(unit_price))
                    print(f"   ✅ Fixed assignment {assignment.id}: {assignment.ear} ear")
                
                fixed_count += 1
    
    if fixed_count > 0:
        db.commit()
        print(f"\n✅ Fixed {fixed_count} bilateral sales")
    else:
        print("\n✅ No bilateral sales need fixing")
        
except Exception as e:
    print(f"❌ Error: {e}")
    db.rollback()
finally:
    db.close()
