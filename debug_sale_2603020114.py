#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps/api'))

from core.database import SessionLocal
from core.models import Sale

db = SessionLocal()

try:
    sale = db.query(Sale).filter_by(id="2603020114").first()
    
    if sale:
        print(f"\n🔍 Sale 2603020114 Debug:")
        print(f"  total_amount: {sale.total_amount}")
        print(f"  discount_type: {sale.discount_type}")
        print(f"  discount_value: {sale.discount_value}")
        print(f"  discount_amount: {sale.discount_amount}")
        print(f"  sgk_coverage: {sale.sgk_coverage}")
        print(f"  final_amount: {sale.final_amount}")
        print(f"  paid_amount: {sale.paid_amount}")
        print(f"  remaining_amount: {sale.final_amount - (sale.paid_amount or 0)}")
        print(f"  unit_list_price: {sale.unit_list_price}")
        print(f"  list_price_total: {sale.list_price_total}")
    else:
        print("Sale not found")
        
finally:
    db.close()
