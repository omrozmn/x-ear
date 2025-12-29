import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app, db
from models.sales import DeviceAssignment

with app.app_context():
    # Get latest assignment
    assignment = DeviceAssignment.query.order_by(DeviceAssignment.created_at.desc()).first()
    
    if assignment:
        print(f"Latest Assignment ID: {assignment.id}")
        print(f"  Patient ID: {assignment.patient_id}")
        print(f"  List Price: {assignment.list_price}")
        print(f"  Sale Price: {assignment.sale_price}")
        print(f"  SGK Scheme: {assignment.sgk_scheme}")
        print(f"  Discount Type: {assignment.discount_type}")
        print(f"  Discount Value: {assignment.discount_value}")
        print(f"  Payment Method: {assignment.payment_method}")
        print(f"  Sale ID: {assignment.sale_id}")
    else:
        print("No assignments found")
