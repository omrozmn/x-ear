from backend import app
from models.base import db
from models.user import User
from flask_jwt_extended import create_access_token


def ensure_admin(session):
    admin = User.query.filter_by(role='admin').order_by(User.created_at).first()
    if not admin:
        admin = User()
        admin.username = 'role-admin'
        admin.email = 'role-admin@x.test'
        admin.set_password('admin123')
        admin.role = 'admin'
        session.add(admin)
        session.commit()
    return admin


def test_assign_and_remove_permission_to_role(client):
    with client.application.app_context():
        admin = ensure_admin(db.session)
        token = create_access_token(identity=admin.id)

        # create role and permission
        r = Role.query.filter_by(name='rp_role').one_or_none()
        if not r:
            r = Role()
            r.name = 'rp_role'
            db.session.add(r)
            db.session.commit()

        p = Permission.query.filter_by(name='rp:perm').one_or_none()
        if not p:
            p = Permission()
            p.name = 'rp:perm'
            db.session.add(p)
            db.session.commit()

        # capture ids for use outside the DB session
        r_id = r.id
        p_id = p.id

    # assign
    res = client.post(f'/api/roles/{r_id}/permissions', headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}, json={'permission': 'rp:perm'})
    assert res.status_code == 200

    # remove
    res2 = client.delete(f'/api/roles/{r_id}/permissions/{p_id}', headers={'Authorization': f'Bearer {token}'})
    assert res2.status_code == 200
