import pytest
import uuid
from core.models.user import User
from core.models.app import App
from core.models.role import Role
from core.models.permission import Permission
from core.models.user_app_role import UserAppRole
from utils.authorization import can

def test_rbac_role_permission_assignment(db_session):
    # Create a test app
    a = db_session.query(App).filter_by(slug='test-rbac-app').first()
    if not a:
        a = App(id=str(uuid.uuid4()), name='Test RBAC App', slug='test-rbac-app')
        db_session.add(a)
    
    db_session.flush()

    # Create permission and role
    perm = db_session.query(Permission).filter_by(name='test:do').first()
    if not perm:
        perm = Permission(id=str(uuid.uuid4()), name='test:do', description='Test permission')
        db_session.add(perm)
    
    db_session.flush()

    role = db_session.query(Role).filter_by(name='test_role').first()
    if not role:
        role = Role(id=str(uuid.uuid4()), name='test_role', description='Role for testing')
        db_session.add(role)
    
    db_session.flush()

    # Associate
    if perm not in role.permissions:
        role.permissions.append(perm)
    db_session.commit()

    # Create user
    u = db_session.query(User).filter_by(email='rbac-user@example.test').first()
    if not u:
        u = User(id=str(uuid.uuid4()), username='rbacuser', email='rbac-user@example.test', tenant_id='tenant-1')
        u.set_password('pass123')
        db_session.add(u)
    
    db_session.flush()

    # Assign role scoped to app
    existing = db_session.query(UserAppRole).filter_by(user_id=u.id, app_id=a.id, role_id=role.id).first()
    if not existing:
        uar = UserAppRole(id=str(uuid.uuid4()), user_id=u.id, app_id=a.id, role_id=role.id)
        db_session.add(uar)
        db_session.commit()

    # Reload user and assert permission using the 'can' utility
    db_session.refresh(u)
    # The 'can' utility currently uses db.session (Flask-style)
    # This might fail if it's not patched. But we're testing the logic here.
    assert can(u, 'test:do', app_id=a.id) is True
    assert can(u, 'nonexistent:perm', app_id=a.id) is False
