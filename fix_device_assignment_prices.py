#!/usr/bin/env python3

import sys
import os
sys.path.append('apps/api')

from core.database import get_db
from core.models import Sale, DeviceAssignment

def fix_device_assignment_prices():
    """Fix device assignment list prices to match sale unit prices"""
    
    # Get database session
    db = next(get_db())
    
    try:
        # Get the problematic sale
        sale = db.query(Sale).filter_by(id='2603020114').first()
        if not sale:
            print('❌ Sale 2603020114 not found')
            return
            
        print(f'🔍 FIXING SALE: {sale.id}')
        print(f'Sale unit_list_price: {getattr(sale, "unit_list_price", "NOT_SET")}')
        print(f'Sale list_price_total: {sale.list_price_total}')
        
        # Get device assignments
        assignments = db.query(DeviceAssignment).filter_by(sale_id=sale.id).all()
        print(f'📱 Found {len(assignments)} device assignments')
        
        # The correct unit price should be 10000 (from sale.unit_list_price or sale.list_price_total)
        correct_unit_price = float(getattr(sale, 'unit_list_price', None) or sale.list_price_total or 0)
        
        if correct_unit_price == 0:
            print('❌ Cannot determine correct unit price from sale')
            return
            
        print(f'✅ Correct unit price should be: {correct_unit_price}')
        
        # Update each device assignment
        for i, assignment in enumerate(assignments):
            print(f'\nAssignment {i+1} (ID: {assignment.id}):')
            print(f'  - Current list_price: {assignment.list_price}')
            print(f'  - Current sale_price: {assignment.sale_price}')
            print(f'  - Ear: {assignment.ear}')
            
            if assignment.list_price != correct_unit_price:
                print(f'  - ❌ FIXING: list_price {assignment.list_price} → {correct_unit_price}')
                assignment.list_price = correct_unit_price
                
                # Also fix sale_price if it's wrong
                if assignment.sale_price != correct_unit_price:
                    print(f'  - ❌ FIXING: sale_price {assignment.sale_price} → {correct_unit_price}')
                    assignment.sale_price = correct_unit_price
            else:
                print(f'  - ✅ Already correct')
        
        # Commit changes
        db.commit()
        print(f'\n✅ FIXED: Updated device assignment prices to {correct_unit_price}')
        
        # Verify the fix
        print(f'\n🔍 VERIFICATION:')
        for i, assignment in enumerate(assignments):
            db.refresh(assignment)
            print(f'Assignment {i+1}: list_price={assignment.list_price}, sale_price={assignment.sale_price}')
        
    except Exception as e:
        db.rollback()
        print(f'❌ Error: {e}')
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    fix_device_assignment_prices()