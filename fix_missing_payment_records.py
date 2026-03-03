#!/usr/bin/env python3
"""
Fix missing payment records for sales with paid_amount > 0
Creates PaymentRecord entries for existing sales that have paid_amount but no payment_records
"""

import sys
import os
from decimal import Decimal
from datetime import datetime
from uuid import uuid4

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps/api'))

from database import get_db
from models.sales import Sale, PaymentRecord

def fix_missing_payment_records():
    """Create missing payment records for sales with paid_amount > 0"""
    db = next(get_db())
    
    try:
        # Find all sales with paid_amount > 0
        sales_with_payment = db.query(Sale).filter(Sale.paid_amount > 0).all()
        
        print(f"Found {len(sales_with_payment)} sales with paid_amount > 0")
        
        created_count = 0
        skipped_count = 0
        
        for sale in sales_with_payment:
            # Check if payment record already exists
            existing_payment = db.query(PaymentRecord).filter_by(
                sale_id=sale.id,
                payment_type='down_payment'
            ).first()
            
            if existing_payment:
                print(f"  ⏭️  Sale {sale.id}: Payment record already exists (amount={existing_payment.amount})")
                skipped_count += 1
                continue
            
            # Create payment record
            payment = PaymentRecord(
                id=f"pay_{uuid4().hex[:8]}",
                tenant_id=sale.tenant_id,
                branch_id=sale.branch_id,
                party_id=sale.party_id,
                sale_id=sale.id,
                amount=Decimal(str(sale.paid_amount)),
                payment_date=sale.sale_date or datetime.utcnow(),
                payment_method=sale.payment_method or 'cash',
                payment_type='down_payment',
                status='paid',
                notes='Peşinat (Otomatik Oluşturuldu)',
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            db.add(payment)
            created_count += 1
            print(f"  ✅ Sale {sale.id}: Created payment record (amount={sale.paid_amount})")
        
        db.commit()
        
        print(f"\n✅ Done! Created {created_count} payment records, skipped {skipped_count}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        db.close()

if __name__ == '__main__':
    fix_missing_payment_records()
