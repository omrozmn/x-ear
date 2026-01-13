from backend import app
from models.base import db
from flask_jwt_extended import create_access_token
from models.user import User


def ensure_admin(session):
    admin = User.query.filter_by(role='admin').order_by(User.created_at).first()
    if not admin:
        admin = User()
        admin.username = 'validator-admin'
        admin.email = 'validator-admin@x.test'
        admin.set_password('admin123')
        admin.role = 'admin'
        session.add(admin)
        session.commit()
    return admin


def test_app_slug_validation(client):
    with client.application.app_context():
        admin = ensure_admin(db.session)
        token = create_access_token(identity=admin.id)

    bad_payload = {'name': 'Bad App', 'slug': 'Invalid Slug!'}
    res = client.post('/api/apps', headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}, json=bad_payload)
    assert res.status_code == 400

    good_payload = {'name': 'Good App', 'slug': 'good-app'}
    res2 = client.post('/api/apps', headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}, json=good_payload)
    assert res2.status_code in (200, 201, 409)


def test_role_and_permission_name_validation(client):
    with client.application.app_context():
        admin = ensure_admin(db.session)
        token = create_access_token(identity=admin.id)

    bad_role = {'name': 'bad role!'}
    res = client.post('/api/roles', headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}, json=bad_role)
    assert res.status_code == 400

    bad_perm = {'name': 'Bad:Perm!'}
    res2 = client.post('/api/permissions', headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}, json=bad_perm)
    assert res2.status_code == 400

    # good names
    res3 = client.post('/api/roles', headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}, json={'name': 'good_role'})
    assert res3.status_code in (200, 201, 409)
    res4 = client.post('/api/permissions', headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}, json={'name': 'good:perm'})
    assert res4.status_code in (200, 201, 409)
