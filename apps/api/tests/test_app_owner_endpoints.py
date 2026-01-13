from backend import app
from models.base import db
from models.user import User
from flask_jwt_extended import create_access_token


def ensure_users(session):
    owner = User.query.filter_by(email='owner@x.test').one_or_none()
    if not owner:
        owner = User()
        owner.username = 'owner'
        owner.email = 'owner@x.test'
        owner.set_password('pass')
        owner.role = 'user'
        session.add(owner)
    other = User.query.filter_by(email='other@x.test').one_or_none()
    if not other:
        other = User()
        other.username = 'other'
        other.email = 'other@x.test'
        other.set_password('pass')
        other.role = 'user'
        session.add(other)
    admin = User.query.filter_by(role='admin').first()
    if not admin:
        admin = User()
        admin.username = 'admin3'
        admin.email = 'admin3@x.test'
        admin.set_password('admin123')
        admin.role = 'admin'
        session.add(admin)
    session.commit()
    return owner, other, admin


def test_owner_can_delete_but_not_other(client):
    with client.application.app_context():
        owner, other, admin = ensure_users(db.session)
        a = App.query.filter_by(slug='owner-delete-app').one_or_none()
        if not a:
            a = App(); a.name = 'Owner Delete'; a.slug = 'owner-delete-app'; db.session.add(a); db.session.commit()
        a.owner_user_id = owner.id
        db.session.add(a); db.session.commit()
        a_id = a.id
        token_owner = create_access_token(identity=owner.id)
        token_other = create_access_token(identity=other.id)
        token_admin = create_access_token(identity=admin.id)

    # other cannot delete
    res = client.delete(f'/api/apps/{a_id}', headers={'Authorization': f'Bearer {token_other}'})
    assert res.status_code == 403

    # owner can delete
    res2 = client.delete(f'/api/apps/{a_id}', headers={'Authorization': f'Bearer {token_owner}'})
    assert res2.status_code == 200

    # recreate app and admin can delete
    with client.application.app_context():
        a2 = App(); a2.name='tmp'; a2.slug='tmp-delete'; db.session.add(a2); db.session.commit()
        aid = a2.id
    res3 = client.delete(f'/api/apps/{aid}', headers={'Authorization': f'Bearer {token_admin}'})
    assert res3.status_code == 200
