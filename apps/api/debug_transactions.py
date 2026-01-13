"""Debug script to inspect transaction_ids in stock_movements"""
import sys
import os

# Ensure backend path is in python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import app  # Import app instance directly

# app = create_app() # removed
with app.app_context():
    from models import StockMovement, DeviceAssignment, Sale, Patient
    from models.base import db  # Correct import for db
    
    item_id = 'item_29112025125106_be0419'
    movements = StockMovement.query.filter_by(inventory_id=item_id).order_by(StockMovement.created_at.desc()).limit(5).all()
    
    print(f"\nAnalyzing last 5 movements for {item_id}:")
    for m in movements:
        print(f"\n--- Movement {m.id} ---")
        print(f"Type: {m.movement_type}")
        print(f"Transaction ID: {m.transaction_id}")
        
        if not m.transaction_id:
            print("No transaction ID")
            continue

        # Check DeviceAssignment
        assignment = db.session.get(DeviceAssignment, m.transaction_id)
        if assignment:
            print(f"✅ Found in DeviceAssignment! Patient ID: {assignment.patient_id}")
            pat = db.session.get(Patient, assignment.patient_id)
            print(f"   Patient: {pat.first_name} {pat.last_name}")
        else:
            print(f"❌ Not found in DeviceAssignment (ID: {m.transaction_id})")

        # Check Sale (maybe it links to Sale?)
        sale = db.session.get(Sale, m.transaction_id)
        if sale:
            print(f"✅ Found in Sale! Patient ID: {sale.patient_id}")
            pat = db.session.get(Patient, sale.patient_id)
            print(f"   Patient: {pat.first_name} {pat.last_name}")
        else:
             # Try querying by sale_id string if ID type mismatch
            sale_by_filter = Sale.query.filter_by(id=str(m.transaction_id)).first()
            if sale_by_filter:
                 print(f"✅ Found in Sale (via filter_by)! Patient ID: {sale_by_filter.patient_id}")
            else:
                 print(f"❌ Not found in Sale (ID: {m.transaction_id})")
