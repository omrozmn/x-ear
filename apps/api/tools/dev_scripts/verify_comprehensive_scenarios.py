import sys
import os
# Add backend root to path to allow imports from app, models, etc.
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
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

def run_comprehensive_tests():
    client = app.test_client()
    
    with app.app_context():
        print("\n=======================================================")
        print("🚀 STARTING COMPREHENSIVE SCENARIO TESTING")
        print("=======================================================")

        # --- SETUP ---
        tenant_id = "default_tenant"
        user_id = str(uuid.uuid4())
        
        # 1. Create Patient
        patient_id = f"pt_{uuid.uuid4().hex[:8]}"
        random_phone = f"555{uuid.uuid4().int % 10000000:07d}"
        patient = Patient(id=patient_id, first_name="Test", last_name="User", phone=random_phone, tenant_id=tenant_id)
        db.session.add(patient)
        
        # 2. Create Inventory Items (Hearing Aid & Loaner)
        inv_id_main = f"inv_{uuid.uuid4().hex[:8]}"
        inv_main = Inventory(
            id=inv_id_main, tenant_id=tenant_id, brand="Phonak", model="Audeo P90", 
            category="hearing_aid", total_inventory=10, 
             available_inventory=10, name="Hearing Aid P90"
        )
        
        inv_id_loaner = f"loan_{uuid.uuid4().hex[:8]}"
        inv_loaner = Inventory(
            id=inv_id_loaner, tenant_id=tenant_id, brand="Oticon", model="Loaner X", 
            category="hearing_aid", total_inventory=5, 
            available_inventory=5, name="Loaner Device X"
        )
        
        db.session.add(inv_main)
        db.session.add(inv_loaner)
        db.session.commit()
        
        print(f"✅ Setup Complete: Patient {patient_id}, Inv {inv_id_main} (10), Loaner {inv_id_loaner} (5)")

        # --- SCENARIO 1: Basic Sale Assignment ---
        print("\n--- SCENARIO 1: Create Basic Sale Assignment ---")
        payload_create = {
            "device_assignments": [{
                "inventoryId": inv_id_main,
                "ear_side": "right",
                "reason": "sale",
                "base_price": 25000.0,
                "payment_method": "cash",
                "notes": "Initial assignment",
                "user_id": user_id
            }],
            "patientId": patient_id
        }
        
        # Correct URL: /api/patients/<id>/assign-devices-extended
        resp = client.post(f'/api/patients/{patient_id}/assign-devices-extended', json=payload_create)
        if resp.status_code not in [200, 201]:
            print(f"❌ Creation Failed: {resp.status_code} - {resp.get_json()}")
            return
            
        data = resp.get_json()
        print(f"   Response JSON: {data}")
        
        if 'device_assignments' not in data:
             print("❌ key 'device_assignments' missing in response")
             return

        sale_id = data['sale']['id']
        assignment = data['device_assignments'][0]
        assignment_id = assignment['id']
        print(f"✅ Created Assignment {assignment_id} linked to Sale {sale_id}")
        
        # Verify DB
        a_db = db.session.get(DeviceAssignment, assignment_id)
        print(f"   DB Check: Price={a_db.list_price} (Exp: 25000.0), Status={a_db.delivery_status}")

        # --- SCENARIO 2: Update Pricing & SGK (Simulating Form Update) ---
        print("\n--- SCENARIO 2: Update Pricing (SGK + Discount) ---")
        # Frontend sends update via PATCH /api/device-assignments/<id>
        # Payload mimics PatientDevicesTab logic
        payload_update_price = {
            "base_price": 25000.0,       # listPrice
            "sgk_scheme": "over18_retired", # sgkSupportType
            "discount_type": "percentage",
            "discount_value": 10.0,
            "sale_price": 0, # Should be ignored if we trigger recalc, or calculated by backend
            # Note: If we send explicit sale_price it overrides. 
            # Let's test providing JUST the params and letting backend calculate
            "notes": "Added SGK and Discount",
            "delivery_status": "pending",
            "reason": "sale"
        }
        
        resp = client.patch(f'/api/device-assignments/{assignment_id}', json=payload_update_price)
        if resp.status_code != 200:
            print(f"❌ Update Failed: {resp.status_code} - {resp.get_json()}")
        else:
            print("✅ Update Response 200 OK")
            
        # Verify Persistence
        db.session.expire_all()
        a_db = db.session.get(DeviceAssignment, assignment_id)
        print(f"   DB Check:")
        print(f"     Parameters: SGK Scheme={a_db.sgk_scheme}, Disc Type={a_db.discount_type}, Disc Value={a_db.discount_value}")
        print(f"     Calculated: SGK Support={a_db.sgk_support} (Exp: >0), Net Payable={a_db.net_payable}")
        
        if a_db.sgk_scheme != "over18_retired" or float(a_db.discount_value or 0) != 10.0:
            print("❌ PERSISTENCE FAILURE: Pricing fields did not match!")

        # --- SCENARIO 3: Update Delivery & Report Status ---
        print("\n--- SCENARIO 3: Update Delivery & Report Status ---")
        payload_status = {
            "delivery_status": "delivered",
            "report_status": "received",
            "serial_number": "SN-12345",
            "user_id": user_id
        }
        
        resp = client.patch(f'/api/device-assignments/{assignment_id}', json=payload_status)
        if resp.status_code != 200:
             print(f"❌ Status Update Failed: {resp.status_code}")
        else:
             print("✅ Status Update 200 OK")
             
        db.session.expire_all()
        a_db = db.session.get(DeviceAssignment, assignment_id)
        inv_check = db.session.get(InventoryItem, inv_id_main)
        
        print(f"   DB Check: Delivery={a_db.delivery_status}, Report={a_db.report_status}")
        print(f"   Stock Check: Available={inv_check.available_inventory} (Exp: 9)")
        
        if a_db.delivery_status != 'delivered' or a_db.report_status != 'received':
             print("❌ PERSISTENCE FAILURE: Status fields did not update!")
        if inv_check.available_inventory != 9:
             print("❌ STOCK FAILURE: Inventory did not decrease!")

        # --- SCENARIO 4: Add Loaner Device ---
        print("\n--- SCENARIO 4: Add Loaner Device (Emanet) ---")
        payload_loaner = {
            "is_loaner": True,
            "loaner_inventory_id": inv_id_loaner,
            "loaner_serial_number": "L-999",
            "user_id": user_id
        }
        
        resp = client.patch(f'/api/device-assignments/{assignment_id}', json=payload_loaner)
        if resp.status_code != 200:
             print(f"❌ Loaner Update Failed: {resp.status_code}")
        else:
             print("✅ Loaner Update 200 OK")
             
        db.session.expire_all()
        a_db = db.session.get(DeviceAssignment, assignment_id)
        inv_loan_check = db.session.get(InventoryItem, inv_id_loaner)
        
        print(f"   DB Check: Is Loaner={a_db.is_loaner}, Loaner Inv ID={a_db.loaner_inventory_id}")
        print(f"   Loaner Stock: Available={inv_loan_check.available_inventory} (Exp: 4)")
        
        if not a_db.is_loaner:
             print("❌ PERSISTENCE FAILURE: is_loaner not True")

        # --- CLEANUP ---
        print("\n--- CLEANUP ---")
        # Explicitly delete sale first to avoid constraint violation
        if sale_id:
            sale_to_del = db.session.get(Sale, sale_id)
            if sale_to_del:
                db.session.delete(sale_to_del)
                
        db.session.delete(a_db)
        db.session.delete(patient)
        db.session.commit()
        print("✅ Cleanup complete")

if __name__ == "__main__":
    run_comprehensive_tests()
