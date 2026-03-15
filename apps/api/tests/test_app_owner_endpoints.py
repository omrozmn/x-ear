import pytest
import uuid
from core.models.user import User
from core.models.app import App
from core.models.admin_user import AdminUser
from jose import jwt
from datetime import datetime, timedelta


@pytest.fixture
def platform_admin_headers(db_session):
    """Create a platform admin (AdminUser) and return auth headers."""
    admin_id = f"adm_{uuid.uuid4().hex[:8]}"
    admin = AdminUser(
        id=admin_id,
        email=f"{admin_id}@platform.test",
        role="super_admin",
        is_active=True,
    )
    admin.set_password("admin123")
    db_session.add(admin)
    db_session.commit()

    payload = {
        "sub": admin.id,
        "role": admin.role,
        "user_type": "admin",
        "is_admin": True,
        "role_permissions": ["*"],
        "perm_ver": 1,
        "exp": datetime.utcnow() + timedelta(hours=1),
    }
    token = jwt.encode(payload, "test-secret", algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


def test_owner_can_delete_but_not_other(client, db_session, platform_admin_headers):
    suffix = uuid.uuid4().hex[:8]
    # Use tenant from conftest (tenant-1) so user lookup works
    owner = User(id=f"o_{suffix}", username=f"owner_{suffix}", email=f"owner_{suffix}@x.com", role='user', tenant_id='tenant-1', is_active=True)
    owner.set_password('pass')
    other = User(id=f"s_{suffix}", username=f"other_{suffix}", email=f"other_{suffix}@x.com", role='user', tenant_id='tenant-1', is_active=True)
    other.set_password('pass')
    db_session.add_all([owner, other])
    db_session.commit()

    a = App(id=f"a_{suffix}", name='Owner Delete', slug=f'slug_{suffix}', owner_user_id=owner.id)
    db_session.add(a)
    db_session.commit()
    
    a_id = a.id
    
    def get_token(u):
        return jwt.encode({'sub': u.id, 'role': u.role, 'tenant_id': u.tenant_id, 'user_type': 'tenant', 'exp': datetime.utcnow() + timedelta(hours=1)}, 'test-secret', algorithm='HS256')

    # Regular users cannot delete (admin_only endpoint)
    res = client.delete(f'/api/apps/{a_id}', headers={'Authorization': f'Bearer {get_token(other)}'})
    assert res.status_code == 403

    res2 = client.delete(f'/api/apps/{a_id}', headers={'Authorization': f'Bearer {get_token(owner)}'})
    assert res2.status_code == 403

    # Platform admin can delete
    res3 = client.delete(f'/api/apps/{a_id}', headers=platform_admin_headers)
    assert res3.status_code == 200

    # Verify second app deletion by platform admin
    a2 = App(id=f"a2_{suffix}", name='tmp', slug=f'tmp_{suffix}')
    db_session.add(a2)
    db_session.commit()
    res4 = client.delete(f'/api/apps/{a2.id}', headers=platform_admin_headers)
    assert res4.status_code == 200
