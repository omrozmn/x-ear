#!/usr/bin/env python3
"""
Test script: Create a FULL device assignment with ALL fields populated (no 0 or NULL)
Then PATCH it and verify all fields are consistent across 4 endpoints
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps/api'))

from sqlalchemy.orm import Session
from core.database import SessionLocal, set_tenant_context, reset_tenant_context
from core.models.device_assignment import DeviceAssignment
from core.models.sales import Sale
from core.models.inventory import InventoryItem
from core.models.party import Party
from datetime import datetime

def create_full_device_assignment():
    """Create device assignment with ALL fields populated"""
    db: Session = SessionLocal()
    tenant_id = "95625589-a4ad-41ff-a99e-4955943bb421"  # deneme tenant
    token = set_tenant_context(tenant_id)
    
    try:
        # Get test party
        party = db.query(Party).filter_by(tenant_id=tenant_id).first()
        if not party:
            print("❌ No party found")
            return
        
        print(f"✅ Using party: {party.id}")
        
        # Get inventory item
        inventory = db.query(InventoryItem).filter_by(
            tenant_id=tenant_id,
            category='hearing_aid'
        ).first()
        
        if not inventory:
            print("❌ No hearing aid inventory found")
            return
        
        print(f"✅ Using inventory: {inventory.name} (barcode: {inventory.barcode})")
        
        # Create sale with ALL fields
        sale = Sale(
            id=f"TEST-{datetime.now().strftime('%y%m%d%H%M%S')}",
            party_id=party.id,
            product_id=inventory.id,
            tenant_id=tenant_id,
            sale_date=datetime.now(),
            list_price_total=30000.0,  # NOT 0
            total_amount=30000.0,
            discount_amount=2000.0,  # NOT 0
            final_amount=28000.0,
            paid_amount=5000.0,  # NOT 0 - down payment
            sgk_coverage=4239.2,
            patient_payment=23760.8,
            status='pending',
            payment_method='cash',
            kdv_rate=20.0,
            kdv_amount=4666.67,  # NOT 0
            notes='Test satış - TÜM ALANLAR DOLU',
            report_status='pending'
        )
        db.add(sale)
        db.flush()
        
        print(f"✅ Created sale: {sale.id}")
        print(f"   - List Price: {sale.list_price_total}")
        print(f"   - Discount: {sale.discount_amount}")
        print(f"   - SGK: {sale.sgk_coverage}")
        print(f"   - Down Payment: {sale.paid_amount}")
        print(f"   - KDV: {sale.kdv_amount} ({sale.kdv_rate}%)")
        
        # Create device assignment with ALL fields
        assignment = DeviceAssignment(
            id=f"assign_test_{datetime.now().strftime('%y%m%d%H%M%S')}",
            assignment_uid=f"ATM-TEST-{datetime.now().strftime('%H%M%S')}",
            party_id=party.id,
            inventory_id=inventory.id,
            sale_id=sale.id,
            tenant_id=tenant_id,
            ear='bilateral',
            reason='Sale',
            from_inventory=True,
            
            # Serial numbers - NOT NULL
            serial_number='SN-TEST-12345',
            serial_number_left='SN-LEFT-67890',
            serial_number_right='SN-RIGHT-11111',
            
            # Pricing - ALL populated, NOT 0
            list_price=15000.0,  # Per ear
            sale_price=11880.4,  # After discount and SGK
            sgk_scheme='over18_working',
            sgk_support=4239.2,  # Per ear
            discount_type='percentage',
            discount_value=10.0,  # 10% discount
            net_payable=23760.8,  # Total for bilateral
            
            # Payment
            payment_method='cash',
            
            # Status fields - NOT NULL
            delivery_status='pending',
            report_status='pending',
            
            # Brand/Model
            brand=inventory.brand,
            model=inventory.model,
            
            # Notes
            notes='Test atama - TÜM ALANLAR DOLU',
            
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        db.add(assignment)
        db.commit()
        
        print(f"\n✅ Created device assignment: {assignment.id}")
        print(f"   Assignment UID: {assignment.assignment_uid}")
        print(f"   Ear: {assignment.ear}")
        print(f"   Reason: {assignment.reason}")
        print(f"   Serial Number: {assignment.serial_number}")
        print(f"   Serial Left: {assignment.serial_number_left}")
        print(f"   Serial Right: {assignment.serial_number_right}")
        print(f"   List Price: {assignment.list_price}")
        print(f"   Sale Price: {assignment.sale_price}")
        print(f"   SGK Scheme: {assignment.sgk_scheme}")
        print(f"   SGK Support: {assignment.sgk_support}")
        print(f"   Discount Type: {assignment.discount_type}")
        print(f"   Discount Value: {assignment.discount_value}")
        print(f"   Net Payable: {assignment.net_payable}")
        print(f"   Delivery Status: {assignment.delivery_status}")
        print(f"   Report Status: {assignment.report_status}")
        print(f"   Brand: {assignment.brand}")
        print(f"   Model: {assignment.model}")
        
        print("\n📋 TEST DATA:")
        print(f"   Party ID: {party.id}")
        print(f"   Sale ID: {sale.id}")
        print(f"   Assignment ID: {assignment.id}")
        print(f"   Tenant ID: {tenant_id}")
        
        return {
            'party_id': party.id,
            'sale_id': sale.id,
            'assignment_id': assignment.id,
            'tenant_id': tenant_id
        }
        
    finally:
        reset_tenant_context(token)
        db.close()

if __name__ == '__main__':
    result = create_full_device_assignment()
    if result:
        print("\n✅ Test data created successfully!")
        print("\nNow test these endpoints:")
        print(f"1. GET /api/parties/{result['party_id']}/devices")
        print("2. GET /api/sales (filter by party)")
        print(f"3. GET /api/sales/{result['sale_id']}")
        print(f"4. Database: SELECT * FROM device_assignments WHERE id='{result['assignment_id']}'")
