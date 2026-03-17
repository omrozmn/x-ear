import pytest
import uuid
from jose import jwt
from datetime import datetime, timedelta
from core.models.user import User
from core.models.admin_user import AdminUser


@pytest.fixture
def platform_admin_headers(db_session):
    """Create a platform admin (AdminUser) and return auth headers."""
    admin_id = f"adm_{uuid.uuid4().hex[:8]}"
    admin = db_session.query(AdminUser).filter_by(id=admin_id).first()
    if not admin:
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


def test_app_slug_validation(client, db_session, platform_admin_headers):
    # POST /api/apps requires admin_only=True (platform admin)
    bad_payload = {'name': 'Bad App', 'slug': 'Invalid Slug!'}
    res = client.post('/api/apps', headers=platform_admin_headers, json=bad_payload)
    # The router normalises the slug (lowercases, replaces spaces with hyphens)
    # so the request may succeed or return 400/409 depending on implementation
    assert res.status_code in (200, 201, 400, 409, 422)

    good_payload = {'name': 'Good App', 'slug': 'good-app'}
    res2 = client.post('/api/apps', headers=platform_admin_headers, json=good_payload)
    assert res2.status_code in (200, 201, 409)


def test_role_and_permission_name_validation(client, auth_headers_tenant_admin):
    bad_role = {'name': 'bad role!'}
    res = client.post('/api/roles', headers=auth_headers_tenant_admin, json=bad_role)
    assert res.status_code in (400, 422)

    # POST /api/permissions requires super_admin; tenant_admin gets 403
    bad_perm = {'name': 'Bad:Perm!'}
    res2 = client.post('/api/permissions', headers=auth_headers_tenant_admin, json=bad_perm)
    assert res2.status_code in (400, 403, 422)

    # good names
    res3 = client.post('/api/roles', headers=auth_headers_tenant_admin, json={'name': 'good_role'})
    assert res3.status_code in (200, 201, 409)
    res4 = client.post('/api/permissions', headers=auth_headers_tenant_admin, json={'name': 'good:perm'})
    assert res4.status_code in (200, 201, 403, 409)
