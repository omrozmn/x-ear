import pytest
import uuid
from core.models.user import User
from core.models.app import App
from jose import jwt
from datetime import datetime, timedelta

def test_owner_can_delete_but_not_other(client, db_session, auth_headers):
    suffix = uuid.uuid4().hex[:8]
    owner = User(id=f"o_{suffix}", username=f"owner_{suffix}", email=f"owner_{suffix}@x.com", role='user', tenant_id='t1', is_active=True)
    owner.set_password('pass')
    other = User(id=f"s_{suffix}", username=f"other_{suffix}", email=f"other_{suffix}@x.com", role='user', tenant_id='t1', is_active=True)
    other.set_password('pass')
    db_session.add_all([owner, other])
    db_session.commit()

    a = App(id=f"a_{suffix}", name='Owner Delete', slug=f'slug_{suffix}', owner_user_id=owner.id)
    db_session.add(a)
    db_session.commit()
    
    a_id = a.id
    
    def get_token(u):
        return jwt.encode({'sub': u.id, 'role': u.role, 'tenant_id': u.tenant_id, 'exp': datetime.utcnow() + timedelta(hours=1)}, 'test-secret', algorithm='HS256')

    # other cannot delete
    res = client.delete(f'/api/apps/{a_id}', headers={'Authorization': f'Bearer {get_token(other)}'})
    assert res.status_code == 403

    # owner can delete
    res2 = client.delete(f'/api/apps/{a_id}', headers={'Authorization': f'Bearer {get_token(owner)}'})
    assert res2.status_code == 200

    # admin can delete
    a2 = App(id=f"a2_{suffix}", name='tmp', slug=f'tmp_{suffix}')
    db_session.add(a2)
    db_session.commit()
    res3 = client.delete(f'/api/apps/{a2.id}', headers=auth_headers)
    assert res3.status_code == 200
