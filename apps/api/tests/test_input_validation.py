import pytest
from core.models.user import User

def ensure_admin(session):
    admin = session.query(User).filter_by(role='admin').order_by(User.created_at).first()
    if not admin:
        admin = User()
        admin.username = 'validator-admin'
        admin.email = 'validator-admin@x.test'
        admin.set_password('admin123')
        admin.role = 'admin'
        session.add(admin)
        session.commit()
    return admin


def test_app_slug_validation(client, db_session, auth_headers):
    # auth_headers is admin by default in conftest.py
    bad_payload = {'name': 'Bad App', 'slug': 'Invalid Slug!'}
    res = client.post('/api/apps', headers=auth_headers, json=bad_payload)
    # FastAPI usually returns 422 for validation error or 400 if custom handled
    assert res.status_code in (400, 422)

    good_payload = {'name': 'Good App', 'slug': 'good-app'}
    res2 = client.post('/api/apps', headers=auth_headers, json=good_payload)
    assert res2.status_code in (200, 201, 409)


def test_role_and_permission_name_validation(client, auth_headers):
    bad_role = {'name': 'bad role!'}
    res = client.post('/api/roles', headers=auth_headers, json=bad_role)
    assert res.status_code in (400, 422)

    bad_perm = {'name': 'Bad:Perm!'}
    res2 = client.post('/api/permissions', headers=auth_headers, json=bad_perm)
    assert res2.status_code in (400, 422)

    # good names
    res3 = client.post('/api/roles', headers=auth_headers, json={'name': 'good_role'})
    assert res3.status_code in (200, 201, 409)
    res4 = client.post('/api/permissions', headers=auth_headers, json={'name': 'good:perm'})
    assert res4.status_code in (200, 201, 409)
