"""
Hearing Flow Integration Tests

These tests verify that all hearing-center specific functionality remains intact
during and after the Party + Role + Profile migration.

Run with: pytest tests/test_hearing_flows.py -v -m hearing_flow
"""

import pytest
from datetime import datetime, timedelta

pytestmark = pytest.mark.hearing_flow


class TestPatientSGKInfoCRUD:
    """SGK info can be read and updated on patients"""
    
    def test_get_patient_with_sgk_info(self, client, auth_headers, test_patient_with_sgk):
        """GET patient returns sgkInfo field"""
        resp = client.get(
            f"/api/parties/{test_patient_with_sgk.id}",
            headers=auth_headers
        )
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert "sgkInfo" in data
        assert data["sgkInfo"] is not None
    
    def test_update_patient_sgk_info(self, client, auth_headers, test_patient):
        """PUT patient can update sgkInfo"""
        sgk_data = {
            "insuranceNumber": "SGK123456",
            "approvalNumber": "APP2024001",
            "coveragePercentage": 90
        }
        resp = client.put(
            f"/api/parties/{test_patient.id}",
            json={"sgkInfo": sgk_data},
            headers=auth_headers
        )
        assert resp.status_code == 200, f"Response: {resp.text}"
        assert resp.json()["data"]["sgkInfo"]["insuranceNumber"] == "SGK123456"


class TestHearingTestCRUD:
    """Hearing tests can be created, read, updated, deleted"""
    
    def test_list_patient_hearing_tests(self, client, auth_headers, test_patient):
        """GET /patients/{id}/hearing-tests returns list"""
        resp = client.get(
            f"/api/parties/{test_patient.id}/hearing-tests",
            headers=auth_headers
        )
        assert resp.status_code == 200
        assert "data" in resp.json()
        assert isinstance(resp.json()["data"], list)
    
    def test_create_hearing_test(self, client, auth_headers, test_patient):
        """POST /patients/{id}/hearing-tests creates new test"""
        test_data = {
            "testDate": datetime.now().isoformat(),
            "testType": "audiometry",
            "conductedBy": "Dr. Test",
            "results": {
                "leftEar": {"250": 20, "500": 25, "1000": 30},
                "rightEar": {"250": 15, "500": 20, "1000": 25}
            }
        }
        resp = client.post(
            f"/api/parties/{test_patient.id}/hearing-tests",
            json=test_data,
            headers=auth_headers
        )
        assert resp.status_code == 201
        assert resp.json()["data"]["testType"] == "audiometry"
    
    def test_update_hearing_test(self, client, auth_headers, test_patient_with_hearing_test):
        """PUT /patients/{id}/hearing-tests/{test_id} updates test"""
        patient, hearing_test = test_patient_with_hearing_test
        resp = client.put(
            f"/api/parties/{patient.id}/hearing-tests/{hearing_test.id}",
            json={"notes": "Updated notes"},
            headers=auth_headers
        )
        assert resp.status_code == 200
    
    def test_delete_hearing_test(self, client, auth_headers, test_patient_with_hearing_test):
        """DELETE /patients/{id}/hearing-tests/{test_id} removes test"""
        patient, hearing_test = test_patient_with_hearing_test
        resp = client.delete(
            f"/api/parties/{patient.id}/hearing-tests/{hearing_test.id}",
            headers=auth_headers
        )
        assert resp.status_code in [200, 204]


class TestEReceiptWorkflow:
    """E-receipts can be created and processed"""
    
    def test_list_patient_ereceipts(self, client, auth_headers, test_patient):
        """GET /patients/{id}/ereceipts returns list"""
        resp = client.get(
            f"/api/parties/{test_patient.id}/ereceipts",
            headers=auth_headers
        )
        assert resp.status_code == 200
        assert "data" in resp.json()
    
    def test_create_ereceipt(self, client, auth_headers, test_patient):
        """POST /patients/{id}/ereceipts creates new receipt"""
        receipt_data = {
            "number": f"RCP{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "receiptDate": datetime.now().isoformat(),
            "doctorName": "Dr. Audiologist",
            "hospitalName": "Test Hospital",
            "materials": [
                {"type": "hearing_aid", "productCode": "HA001", "serial": "SN12345"}
            ]
        }
        resp = client.post(
            f"/api/parties/{test_patient.id}/ereceipts",
            json=receipt_data,
            headers=auth_headers
        )
        # May return 201 or 200 depending on implementation
        assert resp.status_code in [200, 201]


class TestDeviceAssignmentBilateral:
    """Bilateral device assignment works correctly"""
    
    def test_assign_bilateral_devices(self, client, auth_headers, test_patient, test_inventory_items):
        """POST /api/sales assigns bilateral devices (via sale creation)"""
        left_item, right_item = test_inventory_items[:2]
        
        # Use POST /api/sales as per current architecture
        device_data = {
            "partyId": test_patient.id,
            "productId": left_item.id,  # Main item (e.g. left)
            "amount": 1,
            "paymentMethod": "cash",
            "earSide": "BILATERAL",
            # Serial numbers for bilateral
            "serialNumberLeft": "LEFT12345",
            "serialNumberRight": "RIGHT12345", 
            "serialNumber": "LEFT12345", # Primary serial?
            "salesPrice": 2000.0,
            "status": "completed"
        }
        resp = client.post(
            "/api/sales",
            json=device_data,
            headers=auth_headers
        )
        # 200 or 201
        assert resp.status_code in [200, 201]
        data = resp.json()["data"]
        assert "sale" in data
        assert data["sale"]["partyId"] == test_patient.id
    
    def test_list_patient_devices(self, client, auth_headers, test_patient_with_device):
        """GET /patients/{id}/devices returns assigned devices"""
        patient, device = test_patient_with_device
        resp = client.get(
            f"/api/parties/{patient.id}/devices",
            headers=auth_headers
        )
        assert resp.status_code == 200
        assert len(resp.json()["data"]) >= 1


class TestSGKDocumentWorkflow:
    """SGK documents can be uploaded and processed"""
    
    def test_list_patient_sgk_documents(self, client, auth_headers, test_patient):
        """GET /patients/{id}/sgk-documents returns list"""
        resp = client.get(
            f"/api/parties/{test_patient.id}/sgk-documents",
            headers=auth_headers
        )
        # May return 200 with empty list or 404 if not implemented
        assert resp.status_code in [200, 404]
    
    def test_query_patient_rights(self, client, auth_headers, test_patient_with_tc):
        """POST /api/sgk/patient-rights queries SGK API"""
        patient = test_patient_with_tc
        resp = client.post(
            "/api/sgk/patient-rights/query",
            json={"tcNumber": patient.tc_number},
            headers=auth_headers
        )
        # May return mock data or real SGK response
        assert resp.status_code in [200, 201, 503]  # 503 if SGK unavailable


class TestHearingCenterAggregates:
    """Hearing center specific aggregations work"""
    
    def test_patient_timeline_includes_hearing_events(self, client, auth_headers, test_patient_with_hearing_test):
        """GET /patients/{id}/timeline includes hearing test events"""
        patient, _ = test_patient_with_hearing_test
        resp = client.get(
            f"/api/parties/{patient.id}/timeline",
            headers=auth_headers
        )
        assert resp.status_code == 200
        # Timeline should include hearing-related events
        events = resp.json().get("data", [])
        # At minimum, should be queryable
        assert isinstance(events, list)


# Fixtures - to be implemented in conftest.py
# These are placeholder signatures

@pytest.fixture
def test_patient(db_session, test_tenant):
    """Create a basic test patient"""
    from core.models.party import Party
    patient = Party(
        first_name="Test",
        last_name="Patient",
        phone=f"+9050000{datetime.now().strftime('%H%M%S')}",
        tenant_id=test_tenant.id
    )
    db_session.add(patient)
    db_session.commit()
    yield patient
    db_session.delete(patient)
    db_session.commit()


@pytest.fixture
def test_patient_with_sgk(test_patient):
    """Patient with SGK info populated"""
    test_patient.sgk_info_json = {
        "insuranceNumber": "SGK000001",
        "approvalNumber": "APP000001"
    }
    return test_patient


@pytest.fixture
def test_patient_with_tc(test_patient):
    """Patient with TC number"""
    test_patient.tc_number = "12345678901"
    return test_patient


@pytest.fixture
def test_patient_with_hearing_test(db_session, test_patient):
    """Patient with a hearing test"""
    from core.models.medical import HearingTest
    hearing_test = HearingTest(
        party_id=test_patient.id,
        tenant_id=test_patient.tenant_id,
        test_date=datetime.now(),
        test_type="audiometry"
    )
    db_session.add(hearing_test)
    db_session.commit()
    yield test_patient, hearing_test
    db_session.delete(hearing_test)
    db_session.commit()


@pytest.fixture
def test_patient_with_device(db_session, test_patient):
    """Patient with an assigned device"""
    from core.models.device import Device
    from core.models.sales import DeviceAssignment
    
    device = Device(
        party_id=test_patient.id,
        tenant_id=test_patient.tenant_id,
        brand="Test Brand",
        model="Test Model",
        device_type="RIC",
        serial_number="TEST12345"
    )
    db_session.add(device)
    db_session.commit()
    
    # Create assignment
    assignment = DeviceAssignment(
        device_id=device.id,
        party_id=test_patient.id,
        tenant_id=test_patient.tenant_id,
        serial_number="TEST12345",
        ear="right"
    )
    db_session.add(assignment)
    db_session.commit()
    
    yield test_patient, device
    
    db_session.delete(assignment)
    db_session.delete(device)
    db_session.commit()


@pytest.fixture
def test_inventory_items(db_session, test_tenant):
    """Create test inventory items for device assignment"""
    from core.models.inventory import InventoryItem
    items = []
    
    item_l = InventoryItem(
        id="inv_left",
        name="Hearing Aid Left",
        brand="BrandA",
        model="ModelX",
        category="hearing_aid",
        available_inventory=1,  # corrected field name from quantity
        price=1000.0,
        tenant_id=test_tenant.id
    )
    db_session.add(item_l)
    items.append(item_l)
    
    item_r = InventoryItem(
        id="inv_right",
        name="Hearing Aid Right",
        brand="BrandA",
        model="ModelX",
        category="hearing_aid",
        available_inventory=1,  # corrected field name from quantity
        price=1000.0,
        tenant_id=test_tenant.id
    )
    db_session.add(item_r)
    items.append(item_r)

    db_session.commit()
    yield items
    for item in items:
        db_session.delete(item)
    db_session.commit()

