import json
import time
import uuid
from models import db, Patient


def unique_tc_number():
    # Generate a pseudo-unique 11-digit number for tc_number fields
    return f"{int(uuid.uuid4().int % 10**11):011d}"


def test_get_and_create_sgk_documents(client):
    rv = client.get('/api/sgk/documents')
    assert rv.status_code == 200
    data = rv.get_json()
    assert data['success'] is True
    assert isinstance(data['documents'], list)

    # Create document missing fields should return 400
    rv2 = client.post('/api/sgk/documents', json={})
    assert rv2.status_code == 400

    # Create with required fields
    payload = {
        'patientId': 'patient_test_001',
        'filename': 'test.pdf',
        'documentType': 'device_report'
    }

    rv3 = client.post('/api/sgk/documents', json=payload)
    assert rv3.status_code == 201
    data3 = rv3.get_json()
    assert data3['success'] is True
    assert 'data' in data3 or 'document' in data3


def test_get_patient_sgk_documents_requires_patient(client):
    # Create a patient in DB with required fields
    with client.application.app_context():
        p = Patient(id=f'patient_test_{int(time.time())}', tc_number=unique_tc_number(), first_name='Test', last_name='User', phone='555-0000')
        db.session.add(p)
        db.session.commit()
        pid = p.id

    rv = client.get(f"/api/patients/{pid}/sgk-documents")
    assert rv.status_code == 200
    data = rv.get_json()
    assert data['success'] is True
    assert 'documents' in data
