import json
from backend import app
from models.base import db
from models.user import User
from flask_jwt_extended import create_access_token


def test_seed_and_admin_access(client):
    # run seed within app context
    with client.application.app_context():
        # Clean existing admin users to avoid UNIQUE constraint issues
        db.session.query(User).filter_by(username='admin').delete()
        db.session.query(User).filter_by(email='admin@xear.test').delete()
        db.session.commit()
        
        # ensure seed script created users
        from routes import users
        # seed manually small
        admin = User()
        admin.username = 'admin'
        admin.email = 'admin@xear.test'
        admin.set_password('admin123')
        admin.role = 'admin'
        db.session.add(admin)
        db.session.commit()

        token = create_access_token(identity=admin.id)

    # Admin can list users
    res = client.get('/api/users', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200
    body = res.get_json()
    assert body['success'] is True


def test_non_admin_cannot_list(client):
    with client.application.app_context():
        user = User.query.filter_by(email='user@xear.test').one_or_none()
        if not user:
            user = User()
            user.username = 'demo'
            user.email = 'user@xear.test'
            user.set_password('user123')
            user.role = 'user'
            db.session.add(user)
            db.session.commit()
        token = create_access_token(identity=user.id)

    res = client.get('/api/users', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 403 or res.status_code == 401
