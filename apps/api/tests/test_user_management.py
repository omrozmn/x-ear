import pytest
import uuid
from core.models.user import User

def test_seed_and_admin_access(client, db_session, auth_headers):
    # conftest auth_headers is already admin
    res = client.get('/api/users', headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body['success'] is True


def test_non_admin_cannot_list(client, db_session):
    u = User(id=str(uuid.uuid4()), username='demo', email='demo@x.test', role='user', tenant_id='tenant-1', is_active=True)
    u.set_password('user123')
    db_session.add(u)
    db_session.commit()
    
    from jose import jwt
    from datetime import datetime, timedelta
    token = jwt.encode({'sub': u.id, 'role': 'user', 'tenant_id': 'tenant-1', 'exp': datetime.utcnow() + timedelta(hours=1)}, 'test-secret', algorithm='HS256')

    res = client.get('/api/users', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code in (401, 403)
