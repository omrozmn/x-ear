#!/usr/bin/env python3
import sys
sys.path.insert(0, 'apps/api')

from database import SessionLocal
from routers.sales import _build_full_sale_data
from models.sales import Sale

db = SessionLocal()
try:
    # Test Sale 2603020114
    sale = db.query(Sale).filter_by(id='2603020114').first()
    if sale:
        print(f"Testing Sale: {sale.id}")
        print(f"DB values:")
        print(f"  list_price_total: {sale.list_price_total}")
        print(f"  discount_amount: {sale.discount_amount}")
        print(f"  total_amount: {sale.total_amount}")
        print(f"  sgk_coverage: {sale.sgk_coverage}")
        print()
        
        sale_data = _build_full_sale_data(db, sale)
        print(f"Calculated values:")
        print(f"  listPriceTotal: {sale_data.get('listPriceTotal')}")
        print(f"  discountAmount: {sale_data.get('discountAmount')}")
        print(f"  discountType: {sale_data.get('discountType')}")
        print(f"  discountValue: {sale_data.get('discountValue')}")
        print(f"  sgkCoverage: {sale_data.get('sgkCoverage')}")
        print(f"  finalAmount: {sale_data.get('finalAmount')}")
        print(f"  deviceCount: {len(sale_data.get('devices', []))}")
    else:
        print("Sale not found")
finally:
    db.close()
