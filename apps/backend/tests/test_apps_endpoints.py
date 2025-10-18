import json
from backend import app
from models.base import db
from models.user import User
from flask_jwt_extended import create_access_token


def ensure_admin(session):
    admin = User.query.filter_by(role='admin').order_by(User.created_at).first()
    if not admin:
        admin = User()
        admin.username = 'api-admin'
        admin.email = 'api-admin@x.test'
        admin.set_password('admin123')
        admin.role = 'admin'
        session.add(admin)
        session.commit()
    return admin


def test_admin_can_list_apps_and_roles_and_permissions(client):
    with client.application.app_context():
        admin = ensure_admin(db.session)
        token = create_access_token(identity=admin.id)

    res = client.get('/api/apps', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200
    body = res.get_json()
    assert body['success'] is True

    # roles and permissions list endpoints
    roles_res = client.get('/api/roles', headers={'Authorization': f'Bearer {token}'})
    assert roles_res.status_code == 200
    perms_res = client.get('/api/permissions', headers={'Authorization': f'Bearer {token}'})
    assert perms_res.status_code == 200


def test_assign_role_endpoint_and_permission_enforcement(client):
    with client.application.app_context():
        admin = ensure_admin(db.session)
        # ensure an app exists
        app_rec = App.query.filter_by(slug='apitest-app').one_or_none()
        if not app_rec:
            app_rec = App()
            app_rec.name = 'API Test App'
            app_rec.slug = 'apitest-app'
            db.session.add(app_rec)
            db.session.commit()

        # ensure a target user
        target = User.query.filter_by(email='target@x.test').one_or_none()
        if not target:
            target = User()
            target.username = 'target'
            target.email = 'target@x.test'
            target.set_password('pass')
            target.role = 'user'
            db.session.add(target)
            db.session.commit()

        # create a role that will carry users:manage permission
        role_manage = Role.query.filter_by(name='role_manage').one_or_none()
        if not role_manage:
            role_manage = Role()
            role_manage.name = 'role_manage'
            db.session.add(role_manage)
            db.session.commit()

        # ensure permission exists
        perm = Permission.query.filter_by(name='users:manage').one_or_none()
        if not perm:
            perm = Permission()
            perm.name = 'users:manage'
            db.session.add(perm)
            db.session.commit()

        # link role -> permission directly in DB for test
        if perm not in role_manage.permissions:
            role_manage.permissions.append(perm)
            db.session.commit()

        # Admin assigns role_manage to target for the app
        token = create_access_token(identity=admin.id)
        payload = {'userId': target.id, 'role': 'role_manage'}
        assign_res = client.post(f'/api/apps/{app_rec.id}/assign', headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}, data=json.dumps(payload))
        assert assign_res.status_code in (200, 201, 409)

        # Now another user with that role should be able to call assign
        # create actor user
        actor = User.query.filter_by(email='actor@x.test').one_or_none()
        if not actor:
            actor = User()
            actor.username = 'actor'
            actor.email = 'actor@x.test'
            actor.set_password('pass')
            actor.role = 'user'
            db.session.add(actor)
            db.session.commit()

        # give actor the same role on app (admin already can assign; reuse admin to assign)
        uar = UserAppRole.query.filter_by(user_id=actor.id, app_id=app_rec.id, role_id=role_manage.id).one_or_none()
        if not uar:
            uar = UserAppRole()
            uar.user_id = actor.id
            uar.app_id = app_rec.id
            uar.role_id = role_manage.id
            db.session.add(uar)
            db.session.commit()

        # actor now tries to assign 'role_manage' to another user (target2)
        token_actor = create_access_token(identity=actor.id)
        target2 = User.query.filter_by(email='target2@x.test').one_or_none()
        if not target2:
            target2 = User()
            target2.username = 'target2'
            target2.email = 'target2@x.test'
            target2.set_password('pass')
            target2.role = 'user'
            db.session.add(target2)
            db.session.commit()

        payload2 = {'userId': target2.id, 'role': 'role_manage'}
        assign_res2 = client.post(f'/api/apps/{app_rec.id}/assign', headers={'Authorization': f'Bearer {token_actor}', 'Content-Type': 'application/json'}, data=json.dumps(payload2))
        assert assign_res2.status_code in (200, 201, 409)


def test_users_me_includes_app_permissions(client):
    with client.application.app_context():
        # create a user and role/permission, assign, then request /users/me
        user = User.query.filter_by(email='me@x.test').one_or_none()
        if not user:
            user = User()
            user.username = 'me'
            user.email = 'me@x.test'
            user.set_password('pass')
            user.role = 'user'
            db.session.add(user)
            db.session.commit()

        app_rec = App.query.filter_by(slug='meapp').one_or_none()
        if not app_rec:
            app_rec = App()
            app_rec.name = 'Me App'
            app_rec.slug = 'meapp'
            db.session.add(app_rec)
            db.session.commit()

        role = Role.query.filter_by(name='me_role').one_or_none()
        if not role:
            role = Role()
            role.name = 'me_role'
            db.session.add(role)
            db.session.commit()

        perm = Permission.query.filter_by(name='me:do').one_or_none()
        if not perm:
            perm = Permission()
            perm.name = 'me:do'
            db.session.add(perm)
            db.session.commit()

        if perm not in role.permissions:
            role.permissions.append(perm)
            db.session.commit()

        uar = UserAppRole.query.filter_by(user_id=user.id, app_id=app_rec.id, role_id=role.id).one_or_none()
        if not uar:
            uar = UserAppRole()
            uar.user_id = user.id
            uar.app_id = app_rec.id
            uar.role_id = role.id
            db.session.add(uar)
            db.session.commit()

        token = create_access_token(identity=user.id)

    res = client.get('/api/users/me', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200
    body = res.get_json()
    assert body['success'] is True
    data = body['data']
    assert 'apps' in data
    found = False
    for a in data['apps']:
        if a['appSlug'] == 'meapp':
            found = True
            assert 'me:do' in a['permissions']
    assert found is True
