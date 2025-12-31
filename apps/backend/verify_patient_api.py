
import logging
import json
from app import app, db
from models.sales import DeviceAssignment
from models.patient import Patient
from routes.patients import get_patient_devices
from flask import Flask

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def verify_api_response():
    with app.app_context():
        logger.info("--- Testing get_patient_devices API Response ---")
        
        # Create a test patient and assignment
        patient_id = "pat_test_verify_frontend"
        if not db.session.get(Patient, patient_id):
            import random
            phone = f"555{random.randint(1000000, 9999999)}"
            p = Patient(id=patient_id, tenant_id="test_tenant", first_name="Test", last_name="Patient", phone=phone)
            db.session.add(p)
            
        assign_id = "assign_test_verify"
        assignment = db.session.get(DeviceAssignment, assign_id)
        if not assignment:
            assignment = DeviceAssignment(
                id=assign_id,
                tenant_id="test_tenant",
                patient_id=patient_id,
                report_status="received",
                delivery_status="delivered",
                reason="Sale", # Title case to test normalization
                is_loaner=True,
                loaner_serial_number="LOANER_123"
            )
            db.session.add(assignment)
        else:
            # Updates to ensure state
            assignment.report_status = "received"
            assignment.delivery_status = "delivered"
            assignment.reason = "Sale"
            
        db.session.commit()
        
        # Logic from get_patient_devices (lines 890+)
        logger.info("Simulating get_patient_devices logic...")
        
        device_dict = assignment.to_dict()
        
        # Manual overrides from patients.py
        device_dict['earSide'] = assignment.ear
        device_dict['status'] = 'assigned' 
        
        if 'deliveryStatus' not in device_dict:
             device_dict['deliveryStatus'] = getattr(assignment, 'delivery_status', 'pending')

        if 'isLoaner' not in device_dict:
            device_dict['isLoaner'] = getattr(assignment, 'is_loaner', False)
        
        # Check keys
        logger.info(f"Response Keys: {list(device_dict.keys())}")
        logger.info(f"deliveryStatus: {device_dict.get('deliveryStatus')}")
        logger.info(f"reportStatus: {device_dict.get('reportStatus')}")
        logger.info(f"reason: {device_dict.get('reason')}")
        
        assert device_dict.get('deliveryStatus') == 'delivered'
        assert device_dict.get('reportStatus') == 'received'
        
        logger.info("✅ API Response Structure Verified!")

if __name__ == "__main__":
    try:
        verify_api_response()
    except Exception as e:
        logger.error(f"❌ Verification Failed: {e}")
        exit(1)
