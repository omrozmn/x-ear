import json
import pytest
from datetime import datetime
import random
from utils import now_utc


# Tests that exercise many backend API endpoints to ensure canonical behavior and shapes

def generate_valid_tc():
    # Turkish national ID algorithm: 11 digits, first digit non-zero.
    # 10th digit = ((sum of digits at odd positions * 7) - sum of digits at even positions) % 10
    # 11th digit = sum of first 10 digits % 10
    digits = [random.randint(1, 9)]  # first digit 1-9
    for _ in range(8):
        digits.append(random.randint(0, 9))
    # compute 10th
    odd_sum = sum(digits[0:9:2])  # positions 1,3,5,7,9 (0-indexed 0,2,4,6,8)
    even_sum = sum(digits[1:8:2])  # positions 2,4,6,8 (0-indexed 1,3,5,7)
    tenth = ((odd_sum * 7) - even_sum) % 10
    digits.append(tenth)
    eleventh = sum(digits) % 10
    digits.append(eleventh)
    return ''.join(str(d) for d in digits)


def create_sample_patient(client):
    suffix = str(int(now_utc().timestamp() * 1000) % 1000000)
    payload = {
        'firstName': 'Coverage',
        'lastName': 'Tester',
        'tcNumber': generate_valid_tc(),
        'phone': f'555{suffix[:7]}',
        'email': f'coverage+{suffix}@example.com',
        'birthDate': '1980-05-05'
    }
    resp = client.post('/api/patients', json=payload)
    assert resp.status_code in (200, 201)
    body = resp.get_json()
    assert body.get('success')
    pid = body.get('data', {}).get('id')
    assert pid
    return pid


def create_sample_device(client, patient_id=None, category='hearing_aid'):
    if not patient_id:
        patient_id = create_sample_patient(client)
    # Use millisecond-resolution serials to avoid collisions in quick test runs
    serial = f"SNL{int(now_utc().timestamp() * 1000)}"
    payload = {
        'patientId': patient_id,
        'brand': 'TestBrand',
        'model': 'T-1000',
        'type': 'RIC',
        'category': category,
        'serialNumber': serial
    }
    resp = client.post('/api/devices', json=payload)
    assert resp.status_code in (200, 201)
    body = resp.get_json()
    assert body.get('success')
    did = body.get('data', {}).get('id')
    assert did
    return did


def test_health_and_init_db(client):
    # Health should be available
    resp = client.get('/health')
    assert resp.status_code == 200
    body = resp.get_json()
    assert 'status' in body

    # init-db endpoint should return success when called
    resp2 = client.post('/init-db')
    assert resp2.status_code == 200
    b2 = resp2.get_json()
    assert b2.get('success')


def test_patients_crud_and_search(client):
    pid = create_sample_patient(client)

    # Get by id
    resp = client.get(f'/api/patients/{pid}')
    assert resp.status_code == 200
    got = resp.get_json().get('patient') if resp.get_json().get('patient') else resp.get_json().get('data')
    assert got and got.get('id') == pid

    # Update
    resp = client.put(f'/api/patients/{pid}', json={'firstName': 'CoverageUpdated'})
    assert resp.status_code == 200
    assert resp.get_json().get('success')

    # Search
    resp = client.get('/api/patients/search?q=Coverage')
    assert resp.status_code == 200
    assert isinstance(resp.get_json().get('results', []), list)

    # Delete
    resp = client.delete(f'/api/patients/{pid}')
    assert resp.status_code == 200
    assert resp.get_json().get('success')


def test_devices_crud_and_filters(client):
    # Create an inventory device (no patient) so inventory_only filter can find it
    inv_did = create_sample_device(client, patient_id='inventory')
    did = create_sample_device(client)

    # Ensure category filter returns device
    resp = client.get(f'/api/devices?inventory_only=true&category=hearing_aid')
    assert resp.status_code == 200
    devices = resp.get_json().get('devices', [])
    assert any(d.get('id') == inv_did for d in devices)

    # Single device GET
    resp = client.get(f'/api/devices/{did}')
    assert resp.status_code == 200
    assert resp.get_json().get('data', {}).get('id') == did

    # Update device
    resp = client.put(f'/api/devices/{did}', json={'brand': 'UpdatedBrand'})
    assert resp.status_code == 200
    assert resp.get_json().get('success')

    # Stock update (basic semantics)
    resp = client.post(f'/api/devices/{did}/stock-update', json={'operation': 'add', 'quantity': 5, 'reason': 'test'})
    assert resp.status_code == 200
    assert resp.get_json().get('success')

    # categories and brands endpoints
    resp = client.get('/api/devices/categories')
    assert resp.status_code == 200
    cats = resp.get_json().get('categories', [])
    assert isinstance(cats, list)

    resp = client.get('/api/devices/brands')
    assert resp.status_code == 200
    brands = resp.get_json().get('brands', [])
    assert isinstance(brands, list)


def test_assign_ext_sales_and_pricing(client):
    # Prepare data
    pid = create_sample_patient(client)
    did = create_sample_device(client)

    # pricing-preview requires device_assignments shape
    assignment = {
        'device_assignments': [
            {'device_id': did, 'ear_side': 'right', 'base_price': 4500}
        ]
    }
    resp = client.post('/api/pricing-preview', json=assignment)
    assert resp.status_code == 200
    assert resp.get_json().get('success')

    # Extended assignment -> creates sale
    payload = {
        'device_assignments': [
            {'device_id': did, 'ear_side': 'right', 'base_price': 4500}
        ],
        'payment_plan': 'cash'
    }
    resp = client.post(f'/api/patients/{pid}/assign-devices-extended', json=payload)
    assert resp.status_code == 201
    body = resp.get_json()
    assert body.get('success')
    sale = body.get('sale') or body.get('data') or body.get('sale')
    assert sale and sale.get('id')
    sale_id = sale.get('id')

    # Create payment plan for sale (if API supports)
    resp = client.post(f'/api/sales/{sale_id}/payment-plan', json={'plan_type': 'standard'})
    # Accept either 200 or 201 depending on implementation
    assert resp.status_code in (200, 201)

    # Get patient sales
    resp = client.get(f'/api/patients/{pid}/sales')
    assert resp.status_code == 200
    sales = resp.get_json().get('sales', [])
    assert isinstance(sales, list)


def test_campaigns_notifications_and_settings(client):
    # Campaigns: GET and POST
    resp = client.get('/api/campaigns')
    assert resp.status_code == 200
    resp = client.post('/api/campaigns', json={'name': 'Test', 'type': 'sms', 'message': 'Hello'})
    assert resp.status_code in (200, 201)

    # Notifications: create, list, mark read, delete, stats
    notif_payload = {'userId': 'system', 'type': 'system', 'title': 'T1', 'message': 'm'}
    resp = client.post('/api/notifications', json=notif_payload)
    assert resp.status_code == 201
    nid = resp.get_json().get('notification', {}).get('id')
    assert nid

    # List notifications
    resp = client.get('/api/notifications?user_id=system')
    assert resp.status_code == 200

    # Mark read
    resp = client.put(f'/api/notifications/{nid}/read')
    assert resp.status_code == 200

    # Stats
    resp = client.get('/api/notifications/stats?user_id=system')
    assert resp.status_code == 200

    # Delete
    resp = client.delete(f'/api/notifications/{nid}')
    assert resp.status_code == 200

    # Settings GET/PUT
    resp = client.get('/api/settings')
    assert resp.status_code == 200
    settings = resp.get_json().get('settings', {})
    # update a tiny piece of settings safely
    new_settings = settings if settings else {'sgk': {'default_scheme': 'worker'}, 'payment': {'default_plan': 'cash', 'plans': {}}}
    resp = client.put('/api/settings', json={'settings': new_settings})
    assert resp.status_code == 200


def test_appointments_crud(client):
     # Create patient
     pid = create_sample_patient(client)
     payload = {'patientId': pid, 'date': '2025-10-01T10:00:00', 'time': '10:00', 'type': 'consultation'}
     resp = client.post('/api/appointments', json=payload)
     assert resp.status_code in (200, 201)
     aid = resp.get_json().get('appointment', {}).get('id') or resp.get_json().get('data', {}).get('id')
     assert aid
     # Get availability
     resp = client.get('/api/appointments/availability?date=2025-10-01')
     assert resp.status_code == 200


# Run full coverage when this module is executed directly
if __name__ == '__main__':
    import os
    os.environ.setdefault('DATABASE_URL', 'sqlite:////tmp/test_xear_crm.db')
    import pytest
    pytest.main([__file__])
