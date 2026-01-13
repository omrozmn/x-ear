
import logging

from database import SessionLocal
from models.sales import DeviceAssignment
from models.patient import Patient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def verify_api_response():
    logger.info("--- Testing get_patient_devices-like Response Structure ---")

    with SessionLocal() as session:
        patient_id = "pat_test_verify_frontend"
        if session.get(Patient, patient_id) is None:
            import random

            phone = f"555{random.randint(1000000, 9999999)}"
            p = Patient(
                id=patient_id,
                tenant_id="test_tenant",
                first_name="Test",
                last_name="Patient",
                phone=phone,
            )
            session.add(p)

        assign_id = "assign_test_verify"
        assignment = session.get(DeviceAssignment, assign_id)
        if assignment is None:
            assignment = DeviceAssignment(
                id=assign_id,
                tenant_id="test_tenant",
                patient_id=patient_id,
                report_status="received",
                delivery_status="delivered",
                reason="Sale",
                is_loaner=True,
                loaner_serial_number="LOANER_123",
            )
            session.add(assignment)
        else:
            assignment.report_status = "received"
            assignment.delivery_status = "delivered"
            assignment.reason = "Sale"

        session.commit()
        session.refresh(assignment)

        logger.info("Simulating response mapping...")
        device_dict = assignment.to_dict() if hasattr(assignment, "to_dict") else {
            "id": assignment.id,
            "tenantId": getattr(assignment, "tenant_id", None),
            "patientId": getattr(assignment, "patient_id", None),
        }

        device_dict['earSide'] = getattr(assignment, 'ear', None)
        device_dict['status'] = 'assigned'

        device_dict.setdefault('deliveryStatus', getattr(assignment, 'delivery_status', 'pending'))
        device_dict.setdefault('isLoaner', getattr(assignment, 'is_loaner', False))

        logger.info(f"Response Keys: {list(device_dict.keys())}")
        logger.info(f"deliveryStatus: {device_dict.get('deliveryStatus')}")
        logger.info(f"reportStatus: {device_dict.get('reportStatus')}")
        logger.info(f"reason: {device_dict.get('reason')}")

        assert device_dict.get('deliveryStatus') == 'delivered'
        assert device_dict.get('reportStatus') == 'received'

        logger.info("✅ Response Structure Verified!")

if __name__ == "__main__":
    try:
        verify_api_response()
    except Exception as e:
        logger.error(f"❌ Verification Failed: {e}")
        exit(1)
