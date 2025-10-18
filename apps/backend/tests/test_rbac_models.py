from backend import app
from models.base import db
from models.user import User
from backend.utils.authorization import can


def test_rbac_role_permission_assignment(client):
    with client.application.app_context():
        # Create a test app
        a = App.query.filter_by(slug='test-rbac-app').one_or_none()
        if not a:
            a = App()
            a.name = 'Test RBAC App'
            a.slug = 'test-rbac-app'
            db.session.add(a)
            db.session.flush()

        # Create permission and role
        perm = Permission.query.filter_by(name='test:do').one_or_none()
        if not perm:
            perm = Permission()
            perm.name = 'test:do'
            perm.description = 'Test permission'
            db.session.add(perm)
            db.session.flush()

        role = Role.query.filter_by(name='test_role').one_or_none()
        if not role:
            role = Role()
            role.name = 'test_role'
            role.description = 'Role for testing'
            db.session.add(role)
            db.session.flush()

        # Associate
        if perm not in role.permissions:
            role.permissions.append(perm)
        db.session.commit()

        # Create user
        u = User.query.filter_by(email='rbac-user@example.test').one_or_none()
        if not u:
            u = User()
            u.username = 'rbacuser'
            u.email = 'rbac-user@example.test'
            u.set_password('pass123')
            db.session.add(u)
            db.session.flush()

        # Assign role scoped to app
        existing = UserAppRole.query.filter_by(user_id=u.id, app_id=a.id, role_id=role.id).one_or_none()
        if not existing:
            uar = UserAppRole()
            uar.user_id = u.id
            uar.app_id = a.id
            uar.role_id = role.id
            db.session.add(uar)
            db.session.commit()

        # Reload user and assert permission
        u = db.session.get(User, u.id)
        assert can(u, 'test:do', app_id=a.id) is True
        # Negative case
        assert can(u, 'nonexistent:perm', app_id=a.id) is False

