import json
from datetime import datetime
from models.base import db
from models.patient import Patient


def test_create_patient_writes_to_db_and_is_retrievable(client):
    # Create patient via API
    payload = {
        'id': 'py_test_p1',
        'firstName': 'PyTest',
        'lastName': 'Patient',
        'phone': '05320001111',
        'tcNumber': '80000000001'
    }
    rv = client.post('/api/patients', json=payload)
    assert rv.status_code == 201
    data = rv.get_json()
    assert data['success'] is True
    created_id = data['data']['id']

    # Ensure patient is in DB via model query
    p = db.session.get(Patient, created_id)
    assert p is not None
    assert p.first_name == 'PyTest'
    assert p.last_name == 'Patient'

    # Ensure API list returns the patient
    rv2 = client.get('/api/patients')
    assert rv2.status_code == 200
    body = rv2.get_json()
    found = [x for x in body['data'] if x['id'] == created_id]
    assert len(found) == 1


def test_update_patient_api_updates_db(client):
    # Create patient
    payload = {
        'id': 'py_test_p2',
        'firstName': 'Update',
        'lastName': 'Me',
        'phone': '05320002222',
        'tcNumber': '80000000002'
    }
    rv = client.post('/api/patients', json=payload)
    assert rv.status_code == 201

    # Update patient
    update_payload = {
        'firstName': 'UpdatedFirst',
        'lastName': 'UpdatedLast',
        'phone': '05320009999'
    }
    rv2 = client.put('/api/patients/py_test_p2', json=update_payload)
    assert rv2.status_code == 200
    body = rv2.get_json()
    assert body['data']['firstName'] == 'UpdatedFirst'

    # Confirm via DB
    p = db.session.get(Patient, 'py_test_p2')
    assert p.first_name == 'UpdatedFirst'
    assert p.phone == '05320009999'


def test_update_tags_persists(client):
    # Create patient
    payload = {
        'id': 'py_test_p3',
        'firstName': 'Tag',
        'lastName': 'Tester',
        'phone': '05320003333',
        'tcNumber': '80000000003'
    }
    rv = client.post('/api/patients', json=payload)
    assert rv.status_code == 201

    # Update tags via PATCH
    tags_payload = {
        'tags': ['clinic', 'vip', 'e2e-test']
    }
    rv2 = client.patch('/api/patients/py_test_p3', json=tags_payload)
    assert rv2.status_code == 200

    # Confirm via DB
    p = db.session.get(Patient, 'py_test_p3')
    assert p is not None
    stored_tags = json.loads(p.tags) if p.tags else []
    assert 'e2e-test' in stored_tags

    # Confirm API returns tags as an array
    rv3 = client.get('/api/patients/py_test_p3')
    assert rv3.status_code == 200
    body = rv3.get_json()
    assert isinstance(body['data']['tags'], list)
    assert 'e2e-test' in body['data']['tags']
