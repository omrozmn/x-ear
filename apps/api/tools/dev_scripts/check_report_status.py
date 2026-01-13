import sys
import os
# Add backend root to path to allow imports from app, models, etc.
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

import sys
import os
# Ensure we can import from current directory
sys.path.append(os.getcwd())

from app import app
from models.sales import DeviceAssignment
from models.base import db

try:
    with app.app_context():
        # Check specific assignment first
        target_id = "assign_045bcd82"
        assignment = db.session.get(DeviceAssignment, target_id)
        
        print("-" * 50)
        if assignment:
            print(f"DIRECT CHECK ({target_id}):")
            print(f"  ID: {assignment.id}")
            print(f"  Report Status (DB Column): {assignment.report_status}")
            print(f"  Delivery Status: {assignment.delivery_status}")
        else:
            print(f"Assignment {target_id} NOT FOUND.")
        
        print("-" * 50)
        # Scan for any 'received' status for this patient
        print("SCANNING FOR 'received' STATUS (Patient: pat_7931397d):")
        items = db.session.query(DeviceAssignment).filter(DeviceAssignment.patient_id == 'pat_7931397d').all()
        found_any = False
        for item in items:
            if item.report_status == 'received':
                print(f"  FOUND: ID={item.id}, Status={item.report_status}, SaleID={item.sale_id}")
                found_any = True
        
        if not found_any:
            print("  No assignments with report_status='received' found.")
            
        print("-" * 50)
except Exception as e:
    print(f"ERROR: {e}")
