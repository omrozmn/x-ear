import json


def test_patients_list_contract(client):
    resp = client.get('/api/patients')
    assert resp.status_code == 200
    payload = resp.get_json()
    assert isinstance(payload, dict)
    assert 'success' in payload and isinstance(payload['success'], bool)
    assert payload['success'] is True
    assert 'data' in payload and isinstance(payload['data'], list)
    assert 'meta' in payload and isinstance(payload['meta'], dict)
    meta = payload['meta']
    assert 'page' in meta and 'perPage' in meta and 'total' in meta


def test_create_get_update_patient_contract(client):
    # Create
    sample = {
        'firstName': 'Test',
        'lastName': 'Patient',
        'tcNumber': '12345678901',
        'phone': '+905551234567'
    }
    create_resp = client.post('/api/patients', json=sample)
    assert create_resp.status_code in (200, 201)
    create_payload = create_resp.get_json()
    assert create_payload.get('success') is True
    data = create_payload.get('data')
    assert isinstance(data, dict)
    pid = data.get('id')
    assert pid

    # Get
    get_resp = client.get(f'/api/patients/{pid}')
    assert get_resp.status_code == 200
    get_payload = get_resp.get_json()
    assert get_payload.get('success') is True
    assert isinstance(get_payload.get('data'), dict)

    # Update
    update_resp = client.put(f'/api/patients/{pid}', json={'phone': '+905551234568'})
    assert update_resp.status_code == 200
    upd_payload = update_resp.get_json()
    assert upd_payload.get('success') is True
    assert isinstance(upd_payload.get('data'), dict)
    assert upd_payload['data'].get('phone') == '+905551234568'


def test_update_camelcase_firstname(client):
    # Create
    sample = {
        'firstName': 'Camel',
        'lastName': 'Case',
        'tcNumber': '99988877766',
        'phone': '+905551234570'
    }
    create_resp = client.post('/api/patients', json=sample)
    assert create_resp.status_code in (200, 201)
    pid = create_resp.get_json()['data']['id']

    # Update using camelCase key
    update_resp = client.put(f'/api/patients/{pid}', json={'firstName': 'UpdatedCamel'})
    assert update_resp.status_code == 200
    upd_payload = update_resp.get_json()
    assert upd_payload.get('success') is True
    assert upd_payload['data'].get('firstName') == 'UpdatedCamel'

    # Get patient and assert persisted
    get_resp = client.get(f'/api/patients/{pid}')
    assert get_resp.status_code == 200
    data = get_resp.get_json()['data']
    assert data.get('firstName') == 'UpdatedCamel'


def test_delete_patient_contract(client):
    # Create then delete
    sample = {
        'firstName': 'Delete',
        'lastName': 'Me',
        'tcNumber': '11122233344',
        'phone': '+905551234569'
    }
    create_resp = client.post('/api/patients', json=sample)
    pid = create_resp.get_json()['data']['id']

    del_resp = client.delete(f'/api/patients/{pid}')
    assert del_resp.status_code == 200
    del_payload = del_resp.get_json()
    assert del_payload.get('success') is True
    assert isinstance(del_payload.get('data'), dict)
    assert del_payload['data'].get('message')
