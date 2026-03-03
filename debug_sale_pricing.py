#!/usr/bin/env python3

import sys
import os
sys.path.append('apps/api')

from core.database import get_db
from core.models import Sale, DeviceAssignment

def debug_sale_pricing():
    """Debug the pricing display issue for sale 2603020114"""
    
    # Get database session
    db = next(get_db())
    
    try:
        # Get the problematic sale
        sale = db.query(Sale).filter_by(id='2603020114').first()
        if not sale:
            print('❌ Sale 2603020114 not found')
            return
            
        print(f'🔍 DEBUGGING SALE: {sale.id}')
        print(f'Database values:')
        print(f'  - list_price_total: {sale.list_price_total}')
        print(f'  - unit_list_price: {getattr(sale, "unit_list_price", "NOT_SET")}')
        print(f'  - total_amount: {sale.total_amount}')
        print(f'  - discount_type: {getattr(sale, "discount_type", "NOT_SET")}')
        print(f'  - discount_value: {getattr(sale, "discount_value", "NOT_SET")}')
        print(f'  - discount_amount: {sale.discount_amount}')
        print()
        
        # Get device assignments
        assignments = db.query(DeviceAssignment).filter_by(sale_id=sale.id).all()
        print(f'📱 DEVICE ASSIGNMENTS: {len(assignments)} found')
        for i, assignment in enumerate(assignments):
            print(f'Assignment {i+1}:')
            print(f'  - id: {assignment.id}')
            print(f'  - list_price: {assignment.list_price}')
            print(f'  - sale_price: {assignment.sale_price}')
            print(f'  - ear: {assignment.ear}')
            print(f'  - device_id: {assignment.device_id}')
            print()
            
        # Now simulate the _build_full_sale_data logic
        print(f'🧮 SIMULATING _build_full_sale_data LOGIC:')
        
        # Extract unit price logic from the function
        unit_list_price = float(sale.unit_list_price or sale.list_price_total) if (sale.unit_list_price or sale.list_price_total) else 0
        device_count = len(assignments)
        actual_list_price_total = unit_list_price * device_count if device_count > 0 else unit_list_price
        
        print(f'  - unit_list_price calculation: {unit_list_price}')
        print(f'  - device_count: {device_count}')
        print(f'  - actual_list_price_total: {actual_list_price_total}')
        print()
        
        # Check what the API would return
        print(f'🌐 API RESPONSE WOULD SHOW:')
        print(f'  - listPriceTotal: {unit_list_price} (this is what frontend sees as unit price)')
        print(f'  - actualListPriceTotal: {actual_list_price_total}')
        print(f'  - unitListPrice: {unit_list_price}')
        print()
        
        # The issue: frontend shows "Liste Fiyatı (birim): ₺5.000,00 x2"
        # But user expects "Liste Fiyatı (birim): ₺10.000,00 x2"
        print(f'🐛 ISSUE ANALYSIS:')
        print(f'  - Frontend shows: ₺{unit_list_price:,.2f} x{device_count}')
        print(f'  - User expects: ₺10,000.00 x{device_count}')
        print(f'  - Problem: unit_list_price = {unit_list_price} but should be 10000')
        
        if unit_list_price != 10000:
            print(f'  - Root cause: sale.unit_list_price or sale.list_price_total is wrong in DB')
            print(f'  - sale.unit_list_price = {getattr(sale, "unit_list_price", "NOT_SET")}')
            print(f'  - sale.list_price_total = {sale.list_price_total}')
        
    finally:
        db.close()

if __name__ == "__main__":
    debug_sale_pricing()