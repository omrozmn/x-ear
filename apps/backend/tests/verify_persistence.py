from app import app, db
from models.base import gen_id
from models.user import User
from models.inventory import Inventory
from models.sales import Sale, DeviceAssignment
from routes.sales import _create_single_device_assignment, update_device_assignment
import uuid
from datetime import datetime
import json

def verify_persistence():
    with app.app_context():
        print("\n=== Persistence Verification Started ===")
        
        # 1. Setup Tenant and User
        suffix = str(uuid.uuid4())[:8]
        user = User(username=f"verifier_{suffix}", email=f"verify_{suffix}@x.com")
        user.tenant_id = f"tenant_{suffix}"
        user.set_password("testpass123")
        db.session.add(user)
        db.session.commit()
        
        # 2. Create Dummy Inventory
        inv = Inventory(
            id=gen_id("inv"),
            name="Verify Device",
            category="hearing_aid",
            tenant_id=user.tenant_id,
            available_inventory=5,
            price=500.0,
            brand="VerifyBrand"
        )
        db.session.add(inv)
        db.session.commit()
        
        # 3. Create Dummy Sale
        sale = Sale(
            id=gen_id("sale"), 
            tenant_id=user.tenant_id, 
            patient_id="p_verify_1", 
            total_amount=500, 
            sale_date=datetime.utcnow()
        )
        db.session.add(sale)
        db.session.commit()
        
        print("\n--- Test 1: Create Assignment with Report Status ---")
        assignment_data = {
            'inventoryId': inv.id,
            'ear': 'Right',
            'reportStatus': 'pending' # Initial status
        }
        
        assignment, err, warning = _create_single_device_assignment(
            assignment_data, 
            patient_id="p_verify_1", 
            sale_id=sale.id, 
            sgk_scheme="standard", 
            pricing_calculation={}, 
            tenant_id=user.tenant_id,
            created_by=user.id
        )
        
        if err:
            print(f"❌ Creation failed: {err}")
            return
            
        db.session.commit()
        
        # Verify DB value for creation
        db.session.refresh(assignment)
        print(f"Values on create -> ID: {assignment.id}, Report Status: {assignment.report_status}")
        
        if assignment.report_status != 'pending':
            print("❌ Initial persistence failed! Expected 'pending'")
        else:
            print("✅ Initial persistence passed")

        print("\n--- Test 2: Update Assignment Report Status ---")
        # Simulate the PATCH /device-assignments/:id logic
        # We'll just modify the object and commit since we want to test DB mapping, 
        # checking the route logic manually if we can't easily invoke the route function directly without flask request context.
        # But wait, looking at `routes/sales.py`, the `update_device_assignment` is a route handler that expects `request.json`.
        # For verification, we want to know if the MODEL accepts the change and DB saves it.
        
        assignment.report_status = 'received'
        db.session.commit()
        
        # Clear session to ensure we read from DB
        assignment_id = assignment.id
        db.session.expire_all()
        
        fetched_assignment = DeviceAssignment.query.get(assignment_id)
        print(f"Values after update -> ID: {fetched_assignment.id}, Report Status: {fetched_assignment.report_status}")
        
        if fetched_assignment.report_status != 'received':
             print("❌ Update persistence failed! Expected 'received'")
        else:
             print("✅ Update persistence passed")
             
        # Cleanup
        # db.session.delete(fetched_assignment)
        # db.session.delete(sale)
        # db.session.delete(inv)
        # db.session.delete(user)
        # db.session.commit()

if __name__ == "__main__":
    try:
        verify_persistence()
        print("\n🎉 VERIFICATION COMPLETE")
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
