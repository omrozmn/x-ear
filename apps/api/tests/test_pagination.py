import json
from datetime import datetime
from backend.models import Patient, Notification, db


def test_patients_search_pagination(client):
    # seed 5 patients
    patients = []
    with client.application.app_context():
        # Clear existing patients to avoid UNIQUE constraint issues
        db.session.query(Patient).delete()
        db.session.commit()
        
        for i in range(5):
            p = Patient.from_dict({
                'id': f'pat_{i}',
                'firstName': f'First{i}',
                'lastName': f'Last{i}',
                'tcNumber': f'{10000000000 + i}',
                'phone': f'555000{i}'
            })
            db.session.add(p)
        db.session.commit()

    res = client.get('/api/patients/search?page=1&per_page=2')
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert 'data' in data
    assert len(data['data']) == 2
    assert 'meta' in data
    assert data['meta']['total'] >= 5


def test_notifications_pagination(client):
    # create a user and 5 notifications
    user_id = 'user_test'
    with client.application.app_context():
        # Clear existing notifications to avoid UNIQUE constraint issues
        db.session.query(Notification).delete()
        db.session.commit()
        
        for i in range(5):
            n = Notification.from_dict({
                'id': f'notif_{i}',
                'userId': user_id,
                'type': 'system',
                'title': f'Title {i}',
                'message': 'Test message'
            })
            db.session.add(n)
        db.session.commit()

    res = client.get(f'/api/notifications?user_id={user_id}&page=1&per_page=2')
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] is True
    assert isinstance(data['data'], list)
    assert len(data['data']) == 2
    assert 'meta' in data
    assert data['meta']['total'] >= 5
