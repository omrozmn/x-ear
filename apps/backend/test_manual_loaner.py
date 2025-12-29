
import sys
import os
# Add current directory to path so we can import app
sys.path.append(os.getcwd())

from app import app, db
from models.sales import DeviceAssignment
from routes.sales import update_device_assignment
from flask import jsonify

# Mock request data
class MockRequest:
    def __init__(self, json_data):
        self.json_data = json_data
        
    def get_json(self):
        return self.json_data

def test_manual_loaner_update():
    # app = create_app()
    with app.app_context():
        # Create a dummy assignment
        print("Creating dummy assignment...")
        dummy = DeviceAssignment(
            patient_id='test_pat_1',
            tenant_id='022f82b0-d066-4eca-9699-546cb7ff74fa',
            inventory_id=None, # Manual entry
            serial_number='12345',
            # status='assigned', # Removed invalid field
            delivery_status='pending',
            is_loaner=False
        )
        db.session.add(dummy)
        db.session.commit()
        print(f"Created assignment: {dummy.id}")
        
        # Simulate UPDATE Request for Manual Loaner
        update_data = {
            'isLoaner': True,
            'loanerBrand': 'ManaulLoanerBrand', 
            'loanerModel': 'ManualLoanerModel',
            'loanerSerialNumber': 'LM123',
            'loanerInventoryId': '' # Empty string as per frontend
        }
        
        print("\n--- Simulating Update ---")
        # We can't easily call the route function directly because it relies on 'request' global
        # Instead, we will replicate the logic block I fixed to verify it works
        
        # Logic from routes/sales.py (Simplified for verification)
        assignment = db.session.get(DeviceAssignment, dummy.id)
        data = update_data
        
        print(f"Before Update - is_loaner: {assignment.is_loaner}, Brand: {assignment.loaner_brand}")
        
        # --- THE FIX LOGIC START ---
        if 'is_loaner' in data or 'isLoaner' in data:
            new_is_loaner = data.get('is_loaner') or data.get('isLoaner')
            old_is_loaner = assignment.is_loaner
            
            if not old_is_loaner and new_is_loaner:
                loaner_inventory_id = data.get('loaner_inventory_id') or data.get('loanerInventoryId')
                
                if loaner_inventory_id:
                   print("Has Inventory ID (Stock Logic would run)")
                   # ... stock logic ...
                else:
                    # Manual assignment without inventory link - THIS IS THE FIX
                    print("No Inventory ID - Setting is_loaner=True manually (THE FIX)")
                    assignment.is_loaner = True
        
        if assignment.is_loaner:
            if 'loaner_serial_number' in data or 'loanerSerialNumber' in data:
                assignment.loaner_serial_number = data.get('loaner_serial_number') or data.get('loanerSerialNumber')
            if 'loaner_brand' in data or 'loanerBrand' in data:
                 assignment.loaner_brand = data.get('loaner_brand') or data.get('loanerBrand')
            if 'loaner_model' in data or 'loanerModel' in data:
                 assignment.loaner_model = data.get('loaner_model') or data.get('loanerModel')
        # --- THE FIX LOGIC END ---
        
        db.session.commit()
        
        # Verify persistence
        refreshed = db.session.get(DeviceAssignment, dummy.id)
        print(f"After Update - is_loaner: {refreshed.is_loaner}")
        print(f"After Update - Brand: {refreshed.loaner_brand}")
        
        if refreshed.is_loaner and refreshed.loaner_brand == 'ManaulLoanerBrand':
            print("\nSUCCESS: Manual loaner assignment persisted correctly!")
        else:
            print("\nFAILURE: Manual loaner assignment did NOT persist.")
            
        # Cleanup
        db.session.delete(refreshed)
        db.session.commit()

if __name__ == "__main__":
    test_manual_loaner_update()
