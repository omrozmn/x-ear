import json


def test_create_patient_with_identity_and_dob(client):
    sample = {
        'firstName': 'Identity',
        'lastName': 'Tester',
        'identityNumber': '98765432109',
        'dob': '1990-05-01',
        'phone': '+905551234560'
    }
    create_resp = client.post('/api/patients', json=sample)
    assert create_resp.status_code in (200, 201)
    # Created resource should include Location header
    assert 'Location' in create_resp.headers
    assert '/api/patients/' in create_resp.headers.get('Location', '')
    payload = create_resp.get_json()
    assert payload.get('success') is True
    data = payload.get('data')
    assert isinstance(data, dict)
    assert data.get('identityNumber') == '98765432109'
    assert data.get('dob') == '1990-05-01'

    # GET by id returns the same fields
    pid = data.get('id')
    get_resp = client.get(f'/api/patients/{pid}')
    assert get_resp.status_code == 200
    get_payload = get_resp.get_json()
    assert get_payload.get('success') is True
    get_data = get_payload.get('data')
    assert get_data.get('identityNumber') == '98765432109'
    assert get_data.get('dob') == '1990-05-01'


def test_legacy_tcnumber_is_preserved_and_mapped(client):
    sample = {
        'firstName': 'Legacy',
        'lastName': 'User',
        'tcNumber': '11122233344',
        'phone': '+905551234561'
    }
    create_resp = client.post('/api/patients', json=sample)
    assert create_resp.status_code in (200, 201)
    payload = create_resp.get_json()
    assert payload.get('success') is True
    data = payload.get('data')
    # legacy tcNumber should be present and identityNumber should fall back to tcNumber
    assert data.get('tcNumber') == '11122233344'
    assert data.get('identityNumber') in ('11122233344', None)

    pid = data.get('id')
    get_resp = client.get(f'/api/patients/{pid}')
    assert get_resp.status_code == 200
    get_data = get_resp.get_json().get('data')
    assert get_data.get('tcNumber') == '11122233344'
    assert get_data.get('identityNumber') in ('11122233344', None)
