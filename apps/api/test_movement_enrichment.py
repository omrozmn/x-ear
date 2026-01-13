"""Quick script to test patient enrichment in movements"""
from app import create_app
import sys
sys.path.insert(0, '/Users/omerozmen/Desktop/x-ear web app/x-ear/apps/backend')

app = create_app()
with app.app_context():
    from models import StockMovement, DeviceAssignment, Patient
    from database import db
    
    # Get a recent movement
    movement = StockMovement.query.filter_by(inventory_id='item_29112025125106_be0419').order_by(StockMovement.created_at.desc()).first()
    
    if movement:
        print(f"Movement: {movement.id}")
        print(f"Transaction ID: {movement.transaction_id}")
        print(f"Type: {movement.movement_type}")
        
        # Try to find assignment
        if movement.transaction_id:
            assignment = DeviceAssignment.query.filter_by(id=movement.transaction_id).first()
            if assignment:
                print(f"✅ Found assignment: {assignment.id}")
                print(f"Patient ID: {assignment.patient_id}")
                
                patient = Patient.query.get(assignment.patient_id)
                if patient:
                    print(f"✅ Found patient: {patient.first_name} {patient.last_name}")
                else:
                    print("❌ Patient not found")
            else:
                print(f"❌ Assignment not found for transaction_id: {movement.transaction_id}")
    else:
        print("No movements found")
