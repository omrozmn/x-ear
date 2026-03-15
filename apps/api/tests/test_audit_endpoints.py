import pytest
import uuid
from datetime import datetime, timezone
from jose import jwt
from datetime import timedelta
from core.models.user import User, ActivityLog
from core.models.admin_user import AdminUser


@pytest.fixture
def platform_admin_headers(db_session):
    """Create a platform admin for admin_only endpoints."""
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


def test_audit_list_endpoint(client, db_session, platform_admin_headers):
    # create a log entry directly
    log = ActivityLog(
        id=str(uuid.uuid4()),
        user_id='system',
        action='test_action',
        entity_type='test_entity',
        entity_id='e1',
        message='Test audit log message',
        details_json={'foo': 'bar'},
        tenant_id='tenant-1',
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(log)
    db_session.commit()

    res = client.get('/api/audit', headers=platform_admin_headers)
    assert res.status_code == 200
    body = res.json()
    assert body['success'] is True
    assert any(it['action'] == 'test_action' for it in body['data'])
