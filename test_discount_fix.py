#!/usr/bin/env python3
import sys
sys.path.insert(0, 'apps/api')

from core.database import SessionLocal
from core.models import Sale

db = SessionLocal()

# Get sale
sale = db.query(Sale).filter_by(id='2603020114').first()

if sale:
    print('✅ Current Sale 2603020114:')
    print(f'  discount_type: {getattr(sale, "discount_type", "MISSING")}')
    print(f'  discount_value: {getattr(sale, "discount_value", "MISSING")}')
    print(f'  discount_amount: {sale.discount_amount}')
    print(f'  final_amount: {sale.final_amount}')
    print(f'  sgk_coverage: {sale.sgk_coverage}')
    print(f'  total_amount: {sale.total_amount}')
    print()
    
    # Update discount to 15%
    print('📝 Updating discount to 15%...')
    sale.discount_type = 'percentage'
    sale.discount_value = 15.0
    
    # Recalculate discount amount
    # SGK FIRST: total_amount - sgk_coverage = after_sgk
    # DISCOUNT SECOND: after_sgk * (discount_value / 100) = discount_amount
    after_sgk = float(sale.total_amount) - float(sale.sgk_coverage)
    discount_amount = after_sgk * (15.0 / 100)
    final_amount = after_sgk - discount_amount
    
    sale.discount_amount = discount_amount
    sale.final_amount = final_amount
    
    db.commit()
    db.refresh(sale)
    
    print('✅ Updated values:')
    print(f'  discount_type: {sale.discount_type}')
    print(f'  discount_value: {sale.discount_value}')
    print(f'  discount_amount: {sale.discount_amount}')
    print(f'  final_amount: {sale.final_amount}')
    print(f'  remaining: {float(sale.final_amount) - float(sale.paid_amount or 0)}')
else:
    print('❌ Sale not found')

db.close()
