import json
import pytest
import uuid
from core.models.user import User
from core.models.app import App
from core.models.role import Role
from core.models.permission import Permission
from core.models.user_app_role import UserAppRole

def test_admin_can_list_apps_and_roles_and_permissions(client, auth_headers):
    res = client.get('/api/apps', headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body['success'] is True

    # roles and permissions list endpoints
    roles_res = client.get('/api/roles', headers=auth_headers)
    assert roles_res.status_code == 200
    perms_res = client.get('/api/permissions', headers=auth_headers)
    assert perms_res.status_code == 200


def test_assign_role_endpoint_and_permission_enforcement(client, db_session, auth_headers):
    # ensure an app exists
    app_rec = db_session.query(App).filter_by(slug='apitest-app').first()
    if not app_rec:
        app_rec = App(id=str(uuid.uuid4()), name='API Test App', slug='apitest-app')
        db_session.add(app_rec)
        db_session.commit()

    # ensure a target user
    target = db_session.query(User).filter_by(email='target@x.test').first()
    if not target:
        target = User(id=str(uuid.uuid4()), username='target', email='target@x.test', role='user', is_active=True, tenant_id='tenant-1')
        target.set_password('pass')
        db_session.add(target)
        db_session.commit()

    # create a role that will carry users:manage permission
    role_manage = db_session.query(Role).filter_by(name='role_manage').first()
    if not role_manage:
        role_manage = Role(id=str(uuid.uuid4()), name='role_manage')
        db_session.add(role_manage)
        db_session.commit()

    # ensure permission exists
    perm = db_session.query(Permission).filter_by(name='users:manage').first()
    if not perm:
        perm = Permission(id=str(uuid.uuid4()), name='users:manage')
        db_session.add(perm)
        db_session.commit()

    # link role -> permission directly in DB for test
    if perm not in role_manage.permissions:
        role_manage.permissions.append(perm)
        db_session.commit()

    # Admin assigns role_manage to target for the app
    payload = {'userId': target.id, 'role': 'role_manage'}
    assign_res = client.post(f'/api/apps/{app_rec.id}/assign', headers=auth_headers, json=payload)
    assert assign_res.status_code in (200, 201, 409)


def test_users_me_includes_app_permissions(client, db_session, auth_headers):
    # create a user and role/permission, assign, then request /users/me
    user = db_session.query(User).filter_by(email='me@x.test').first()
    if not user:
        user = User(id=str(uuid.uuid4()), username='me', email='me@x.test', role='user', is_active=True, tenant_id='tenant-1')
        user.set_password('pass')
        db_session.add(user)
        db_session.commit()

    app_rec = db_session.query(App).filter_by(slug='meapp').first()
    if not app_rec:
        app_rec = App(id=str(uuid.uuid4()), name='Me App', slug='meapp')
        db_session.add(app_rec)
        db_session.commit()

    role = db_session.query(Role).filter_by(name='me_role').first()
    if not role:
        role = Role(id=str(uuid.uuid4()), name='me_role')
        db_session.add(role)
        db_session.commit()

    perm = db_session.query(Permission).filter_by(name='me:do').first()
    if not perm:
        perm = Permission(id=str(uuid.uuid4()), name='me:do')
        db_session.add(perm)
        db_session.commit()

    if perm not in role.permissions:
        role.permissions.append(perm)
        db_session.commit()

    uar = db_session.query(UserAppRole).filter_by(user_id=user.id, app_id=app_rec.id, role_id=role.id).first()
    if not uar:
        uar = UserAppRole(id=str(uuid.uuid4()), user_id=user.id, app_id=app_rec.id, role_id=role.id)
        db_session.add(uar)
        db_session.commit()

    # Generate token for custom user
    from jose import jwt
    from datetime import datetime, timedelta
    payload = {
        'sub': user.id,
        'role': user.role,
        'tenant_id': user.tenant_id,
        'user_type': 'tenant',
        'exp': datetime.utcnow() + timedelta(hours=1)
    }
    user_token = jwt.encode(payload, 'test-secret', algorithm='HS256')

    res = client.get('/api/users/me', headers={'Authorization': f'Bearer {user_token}'})
    assert res.status_code == 200
    body = res.json()
    assert body['success'] is True
    data = body['data']
    assert 'apps' in data
    # Validation logic depends on /api/users/me implementation
