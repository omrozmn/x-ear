from core.models.party import Party
from core.models.notification import Notification

def test_patients_search_pagination(client, db_session, auth_headers):
    # seed 5 patients
    # Clear existing patients to avoid UNIQUE constraint issues
    db_session.query(Party).delete()
    db_session.commit()
    
    for i in range(5):
        p = Party(
            id=f'pat_{i}',
            first_name=f'SearchFirst{i}',
            last_name=f'SearchLast{i}',
            tc_number=f'{10000000000 + i}',
            phone=f'555000{i}',
            tenant_id='tenant-1'
        )
        db_session.add(p)
    db_session.commit()

    # /api/parties/search requires a 'q' parameter and uses 'limit'
    res = client.get('/api/parties/search?q=Search&limit=2', headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data['success'] is True
    assert 'data' in data
    assert len(data['data']) == 2


def test_notifications_pagination(client, db_session, auth_headers):
    # create a user and 5 notifications
    user_id = 'user_test'
    # Clear existing notifications to avoid UNIQUE constraint issues
    db_session.query(Notification).delete()
    db_session.commit()
    
    for i in range(5):
        n = Notification(
            id=f'notif_{i}',
            user_id=user_id,
            notification_type='system',
            title=f'Title {i}',
            message='Test message',
            tenant_id='tenant-1'
        )
        db_session.add(n)
    db_session.commit()

    res = client.get(f'/api/notifications?user_id={user_id}&page=1&per_page=2', headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data['success'] is True
    assert isinstance(data['data'], list)
    assert len(data['data']) == 2
    assert 'meta' in data
    assert data['meta']['total'] >= 5
