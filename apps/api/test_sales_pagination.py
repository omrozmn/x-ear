def test_patient_sales_pagination(client):
    # Create a test patient
    sample = {
        'firstName': 'Sale',
        'lastName': 'Tester',
        'phone': '+905551234570'
    }
    create_resp = client.post('/api/patients', json=sample)
    pid = create_resp.get_json()['data']['id']

    # Ensure at least one sale exists by assigning a device (use existing sample device)
    sale_payload = {
        'device_assignments': [
            {'device_id': 'dev_sample_001', 'ear_side': 'R', 'base_price': 2500}
        ],
        'payment_plan': 'cash'
    }
    assign_resp = client.post(f'/api/patients/{pid}/assign-devices-extended', json=sale_payload)
    assert assign_resp.status_code in (200, 201)

    # List sales with pagination
    list_resp = client.get(f'/api/patients/{pid}/sales?page=1&per_page=10')
    assert list_resp.status_code == 200
    payload = list_resp.get_json()
    assert payload.get('success') is True
    assert isinstance(payload.get('data'), list)
    assert 'meta' in payload
