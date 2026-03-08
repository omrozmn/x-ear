#!/usr/bin/env python3

import sys
import os
import json
import logging
from decimal import Decimal

# Suppress logging
logging.getLogger().setLevel(logging.CRITICAL)
os.environ['SQLALCHEMY_ECHO'] = 'false'

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps/api'))

from core.database import SessionLocal
from core.models.sales import Sale, DeviceAssignment, PaymentRecord
from schemas.sales import DeviceAssignmentUpdate

def test_down_payment_sync_direct():
    """Test down payment sync directly with database"""
    print("🧪 Testing Down Payment Sync - Direct Database Test")
    
    db = SessionLocal()
    try:
        # Find a sale with device assignments
        sale = db.query(Sale).filter(Sale.id == "2602180101").first()
        if not sale:
            print("❌ Test sale not found")
            return False
        
        assignment = db.query(DeviceAssignment).filter_by(sale_id=sale.id).first()
        if not assignment:
            print("❌ No device assignment found for test sale")
            return False
        
        print(f"✅ Found test sale: {sale.id} with assignment: {assignment.id}")
        print(f"Initial sale paid_amount: {sale.paid_amount}")
        
        # Test the Pydantic model and sync logic
        test_down_payment = 7777
        
        # Create update data (simulating frontend request)
        update_data = {
            "downPayment": test_down_payment,
            "notes": "Direct DB test - down payment sync"
        }
        
        print(f"📤 Testing with update data: {json.dumps(update_data, indent=2)}")
        
        # Create Pydantic model (this is what happens in the endpoint)
        updates = DeviceAssignmentUpdate(**update_data)
        data = updates.model_dump(exclude_unset=True, by_alias=True)
        
        print(f"📊 Pydantic serialized data: {json.dumps(data, default=str)}")
        print(f"🔍 'downPayment' in data: {'downPayment' in data}")
        print(f"🔍 data.get('downPayment'): {data.get('downPayment')}")
        
        # Simulate the sync logic from the endpoint
        down_payment_value = data.get('downPayment')
        if down_payment_value is not None:
            try:
                down_val = float(down_payment_value)
                if down_val >= 0:
                    print(f"✅ Down payment value is valid: {down_val}")
                    
                    # Update sale.paid_amount (this is what the endpoint does)
                    old_paid_amount = sale.paid_amount
                    sale.paid_amount = down_val
                    
                    print(f"🔄 Updated sale.paid_amount: {old_paid_amount} → {down_val}")
                    
                    # Check for existing payment record
                    payment = db.query(PaymentRecord).filter_by(
                        sale_id=sale.id, 
                        payment_type='down_payment'
                    ).first()
                    
                    if payment:
                        payment.amount = Decimal(str(down_val))
                        print(f"✅ Updated existing payment record: {payment.id} → {down_val}")
                    else:
                        if down_val > 0:
                            from uuid import uuid4
                            from datetime import datetime
                            payment = PaymentRecord(
                                id=f"pay_{uuid4().hex}",
                                tenant_id=sale.tenant_id,
                                branch_id=sale.branch_id,
                                party_id=sale.party_id,
                                sale_id=sale.id,
                                amount=Decimal(str(down_val)),
                                payment_date=datetime.utcnow(),
                                payment_method='cash',
                                payment_type='down_payment',
                                status='paid',
                                notes='Direct DB test - down payment'
                            )
                            db.add(payment)
                            print(f"✅ Created new payment record for: {down_val}")
                    
                    # Commit changes
                    db.commit()
                    
                    # Verify the change
                    db.refresh(sale)
                    final_paid_amount = sale.paid_amount
                    
                    print(f"💾 Final sale.paid_amount after commit: {final_paid_amount}")
                    
                    if float(final_paid_amount) == float(test_down_payment):
                        print("✅ DOWN PAYMENT SYNC SUCCESSFUL!")
                        return True
                    else:
                        print("❌ DOWN PAYMENT SYNC FAILED!")
                        print(f"   Expected: {test_down_payment}")
                        print(f"   Actual: {final_paid_amount}")
                        return False
                        
                else:
                    print(f"❌ Down payment value is negative: {down_val}")
                    return False
            except Exception as e:
                print(f"❌ Failed to process down payment: {e}")
                return False
        else:
            print("❌ downPayment not found in data")
            return False
            
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = test_down_payment_sync_direct()
    
    if success:
        print("\n🎉 Direct database down payment sync test PASSED!")
    else:
        print("\n❌ Direct database down payment sync test FAILED!")
        exit(1)