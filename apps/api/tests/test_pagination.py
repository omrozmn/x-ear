import json
from datetime import datetime
from core.models.party import Party
from core.models.notification import Notification

def test_patients_search_pagination(client, db_session):
    # seed 5 patients
    # Clear existing patients to avoid UNIQUE constraint issues
    db_session.query(Party).delete()
    db_session.commit()
    
    for i in range(5):
        p = Party(
            id=f'pat_{i}',
            first_name=f'First{i}',
            last_name=f'Last{i}',
            tc_number=f'{10000000000 + i}',
            phone=f'555000{i}',
            tenant_id='tenant-1'
        )
        db_session.add(p)
    db_session.commit()

    res = client.get('/api/patients/search?page=1&per_page=2')
    assert res.status_code == 200
    data = res.json()
    assert data['success'] is True
    assert 'data' in data
    assert len(data['data']) == 2
    assert 'meta' in data
    assert data['meta']['total'] >= 5


def test_notifications_pagination(client, db_session):
    # create a user and 5 notifications
    user_id = 'user_test'
    # Clear existing notifications to avoid UNIQUE constraint issues
    db_session.query(Notification).delete()
    db_session.commit()
    
    for i in range(5):
        n = Notification(
            id=f'notif_{i}',
            user_id=user_id,
            type='system',
            title=f'Title {i}',
            message='Test message',
            tenant_id='tenant-1'
        )
        db_session.add(n)
    db_session.commit()

    res = client.get(f'/api/notifications?user_id={user_id}&page=1&per_page=2')
    assert res.status_code == 200
    data = res.json()
    assert data['success'] is True
    assert isinstance(data['data'], list)
    assert len(data['data']) == 2
    assert 'meta' in data
    assert data['meta']['total'] >= 5
