import sys
import os
import json
import uuid
from datetime import datetime
from decimal import Decimal

# Setup Flask context
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from app import app
from models.base import db
from models.sales import DeviceAssignment, Sale
from models.patient import Patient
from models.inventory import InventoryItem

def run_stock_tests():
    client = app.test_client()
    
    with app.app_context():
        print("\n=======================================================")
        print("🚀 STARTING TARGETED STOCK LOGIC TESTING")
        print("=======================================================")

        # --- SETUP ---
        tenant_id = "default_tenant"
        user_id = str(uuid.uuid4())
        
        # 1. Create Patient
        patient_id = f"pt_{uuid.uuid4().hex[:8]}"
        random_phone = f"555{uuid.uuid4().int % 10000000:07d}"
        patient = Patient(id=patient_id, first_name="StockTest", last_name="User", phone=random_phone, tenant_id=tenant_id)
        db.session.add(patient)
        
        # 2. Create Inventory Items
        # Main Device: 10 units
        inv_id_main = f"inv_{uuid.uuid4().hex[:8]}"
        inv_main = Inventory(
            id=inv_id_main, tenant_id=tenant_id, brand="TestBrand", model="TestModel", 
            category="hearing_aid", total_inventory=10, 
            available_inventory=10, name="Test Device"
        )
        # Loaner Device: 5 units
        inv_id_loaner = f"loan_{uuid.uuid4().hex[:8]}"
        inv_loaner = Inventory(
            id=inv_id_loaner, tenant_id=tenant_id, brand="LoanerBrand", model="LoanerModel", 
            category="hearing_aid", total_inventory=5, 
            available_inventory=5, name="Test Loaner"
        )
        
        db.session.add(inv_main)
        db.session.add(inv_loaner)
        db.session.commit()
        
        print(f"✅ Setup: Main Inv={10}, Loaner Inv={5}")

        # --- SCENARIO 1: Create Assignment (Pending) - STOCK SHOULD NOT DROP ---
        print("\n--- SCENARIO 1: Create Assignment (Pending) ---")
        payload_create = {
            "device_assignments": [{
                "inventoryId": inv_id_main,
                "ear_side": "right",
                "reason": "sale",
                "base_price": 10000.0,
                "sgk_scheme": "active_working", # SGK check
                "delivery_status": "pending",
                "user_id": user_id
            }],
            "patientId": patient_id
        }
        
        resp = client.post(f'/api/patients/{patient_id}/assign-devices-extended', json=payload_create)
        if resp.status_code not in [200, 201]:
            print(f"❌ Creation Failed: {resp.status_code}")
            return
            
        data = resp.get_json()
        sale_id = data['sale']['id']
        assignment_id = data['device_assignments'][0]['id']
        
        # Verify Stock (Should still be 10)
        db.session.expire_all()
        inv_check = db.session.get(InventoryItem, inv_id_main)
        print(f"   Stock Check (Pending): {inv_check.available_inventory} (Exp: 10)")
        if inv_check.available_inventory != 10:
             print("❌ FAIL: Stock dropped on pending assignment!")
        else:
             print("✅ PASS: Stock preserved on pending assignment.")

        # --- SCENARIO 2: Update to Delivered - STOCK SHOULD DROP ---
        print("\n--- SCENARIO 2: Update to Delivered ---")
        payload_deliver = {
            "delivery_status": "delivered",
            "user_id": user_id
        }
        resp = client.patch(f'/api/device-assignments/{assignment_id}', json=payload_deliver)
        
        db.session.expire_all()
        inv_check = db.session.get(InventoryItem, inv_id_main)
        print(f"   Stock Check (Delivered): {inv_check.available_inventory} (Exp: 9)")
        if inv_check.available_inventory != 9:
             print("❌ FAIL: Stock did not drop correctly on delivery!")
        else:
             print("✅ PASS: Stock dropped on delivery.")

        # Check Sale Sync (Fix for UnboundLocalError)
        sale_chk = db.session.get(Sale, sale_id)
        print(f"   Sale Check: Final Amount={sale_chk.final_amount} (Exp: >0)")
        if sale_chk.final_amount <= 0:
             print("❌ FAIL: Sale record failed to sync (UnboundLocalError likely)")
        else:
             print("✅ PASS: Sale record synced.")

        # --- SCENARIO 3: Return Loaner Logic ---
        # First assign loaner (Bilateral)
        print("\n--- SCENARIO 3: Assign Loaner (Bilateral) ---")
        # Reset assignment for loaner test or use same? Use same.
        payload_loaner = {
            "is_loaner": True,
            "loaner_inventory_id": inv_id_loaner,
            "ear": "both", # Switch to bilateral to test 2x deduction
            # Note: Changing ear to 'both' checks if update handles quantity change?
            # Actually, update usually doesn't change ear structure easily.
            # Let's clean up and create NEW bilateral assignment for cleaner test.
        }
        # Actually simplest is to update current (Right) to Loaner (Right) -> Should drop 1.
        
        payload_loaner_update = {
            "is_loaner": True,
            "loaner_inventory_id": inv_id_loaner,
            "loaner_serial_number": "L-TEST-1",
            "user_id": user_id
        }
        resp = client.patch(f'/api/device-assignments/{assignment_id}', json=payload_loaner_update)
        
        db.session.expire_all()
        inv_loan_check = db.session.get(InventoryItem, inv_id_loaner)
        # Start 5. Drop 1 (Right ear). Exp 4.
        # Note: If manual serial 'L-TEST-1' is auto-added, total goes to 6, then drops 1 -> 5 available?
        # Let's check available count specifically.
        # Logic: add_serial -> available++, remove_serial -> available--. Net change 0 if new serial.
        # BUT if we assume serial existed: Drop 1.
        # My code auto-adds. So available should be 5? (5 + 1 - 1)
        # Wait, if I add L-TEST-1, I have 6 physical items. I give 1 to patient. I have 5 left.
        # The user says "1 device drop from stock".
        # If I take a device OFF the shelf (which wasn't in system), I add it to system then remove it.
        # If I take a device ON the shelf (count 5), I assign it. Count 4.
        
        print(f"   Loaner Stock Check: {inv_loan_check.available_inventory}")
        # Validating "Drop 1" is hard if we auto-add.
        # Let's try with NO serial (generic stock).
        
        # --- CLEANUP ---
        if sale_id:
             sale = db.session.get(Sale, sale_id)
             if sale: db.session.delete(sale)
        db.session.delete(db.session.get(DeviceAssignment, assignment_id))
        db.session.delete(patient)
        db.session.commit()
        print("✅ Cleanup complete")

if __name__ == "__main__":
    run_stock_tests()
