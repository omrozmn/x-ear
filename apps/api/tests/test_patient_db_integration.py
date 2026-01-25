import json
import sys
import time
from datetime import datetime
from core.models.party import Party
from core.models.party_role import PartyRole
from core.models.hearing_profile import HearingProfile

def test_create_party_writes_to_db_and_is_retrievable(client, db_session, auth_headers):
    # Create party (patient) via API
    suffix = str(int(time.time() * 1000))[-7:]
    payload = {
        'id': f'py_test_p1_{suffix}',
        'firstName': 'PyTest',
        'lastName': 'Patient',
        'phone': f'0532{suffix}',
        'tcNumber': f'80{suffix}01',
        'gender': 'M',
        'status': 'active'
    }
    rv = client.post('/api/parties', json=payload, headers=auth_headers)
    assert rv.status_code == 201
    data = rv.json()
    assert data['success'] is True
    created_id = data['data']['id']

    # Ensure party is in DB via model query
    p = db_session.get(Party, created_id)
    assert p is not None
    assert p.first_name == 'PyTest'
    assert p.last_name == 'Patient'
    assert p.tc_number == payload['tcNumber']

    # Ensure API list returns the party
    rv2 = client.get('/api/parties', headers=auth_headers)
    assert rv2.status_code == 200
    body = rv2.json()
    # Handle response envelope data structure
    parties = body['data']['parties'] if isinstance(body['data'], dict) and 'parties' in body['data'] else body['data']
    found = [x for x in parties if x['id'] == created_id]
    assert len(found) == 1


def test_update_party_api_updates_db(client, db_session, auth_headers):
    # Create party
    suffix = str(int(time.time() * 1000))[-7:]
    payload = {
        'firstName': 'Update',
        'lastName': 'Me',
        'phone': f'0532{suffix}',
        'tcNumber': f'80{suffix}02'
    }
    rv = client.post('/api/parties', json=payload, headers=auth_headers)
    assert rv.status_code == 201
    created_id = rv.json()['data']['id']

    # Update party
    update_payload = {
        'firstName': 'UpdatedFirst',
        'lastName': 'UpdatedLast',
        'phone': '05320009999'
    }
    rv2 = client.put(f'/api/parties/{created_id}', json=update_payload, headers=auth_headers)
    assert rv2.status_code == 200
    body = rv2.json()
    assert body['data']['firstName'] == 'UpdatedFirst'

    # Confirm via DB
    db_session.expire_all()
    p = db_session.get(Party, created_id)
    assert p is not None
    assert p.first_name == 'UpdatedFirst'
    assert p.phone == '05320009999'


def test_party_role_and_hearing_profile(client, db_session, auth_headers):
    # 1. Create party
    suffix = str(int(time.time() * 1000))[-7:]
    payload = {
        'firstName': 'Complex',
        'lastName': 'User',
        'phone': f'0532{suffix}',
        'tcNumber': f'80{suffix}04'
    }
    rv = client.post('/api/parties', json=payload, headers=auth_headers)
    assert rv.status_code == 201
    created_id = rv.json()['data']['id']

    # 2. Assign role directly to DB 
    role = PartyRole(party_id=created_id, role_code='patient', tenant_id='tenant-1')
    db_session.add(role)
    try:
        db_session.commit()
    except Exception:
        db_session.rollback()

    # 3. Add hearing profile (only if not created by service)
    existing_profile = db_session.query(HearingProfile).filter_by(party_id=created_id).first()
    if not existing_profile:
        profile = HearingProfile(
            party_id=created_id,
            tenant_id='tenant-1',
            sgk_info_json={'status': 'eligible'}
        )
        db_session.add(profile)
        db_session.commit()
    else:
        existing_profile.sgk_info_json = {'status': 'eligible'}
        db_session.commit()

    # 4. Verify via API GET
    db_session.expire_all()
    rv2 = client.get(f'/api/parties/{created_id}', headers=auth_headers)
    assert rv2.status_code == 200
    data = rv2.json()['data']
    
    assert 'roles' in data
    assert any(r['code'] == 'patient' for r in data['roles'])
    assert 'hearingProfile' in data
    assert data['hearingProfile']['sgkInfo']['status'] == 'eligible'


def test_update_tags_persists(client, db_session, auth_headers):
    # Create party
    suffix = str(int(time.time() * 1000))[-7:]
    payload = {
        'firstName': 'Tag',
        'lastName': 'Tester',
        'phone': f'0532{suffix}',
        'tcNumber': f'80{suffix}03'
    }
    rv = client.post('/api/parties', json=payload, headers=auth_headers)
    assert rv.status_code == 201
    created_id = rv.json()['data']['id']

    # Update tags via PUT
    tags_payload = {
        'tags': ['clinic', 'vip', 'e2e-test']
    }
    rv2 = client.put(f'/api/parties/{created_id}', json=tags_payload, headers=auth_headers)
    assert rv2.status_code == 200

    # Confirm via DB
    db_session.expire_all()
    p = db_session.get(Party, created_id)
    assert p is not None
    stored_tags = json.loads(p.tags) if p.tags else []
    assert 'e2e-test' in stored_tags

    # Confirm API returns tags as an array
    rv3 = client.get(f'/api/parties/{created_id}', headers=auth_headers)
    assert rv3.status_code == 200
    body = rv3.json()
    assert isinstance(body['data']['tags'], list)
    assert 'e2e-test' in body['data']['tags']
