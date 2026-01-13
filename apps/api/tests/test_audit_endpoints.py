from backend import app
from models.base import db
from models.user import User, ActivityLog
from backend.app import log_activity
from flask_jwt_extended import create_access_token


def ensure_admin(session):
    admin = User.query.filter_by(role='admin').order_by(User.created_at).first()
    if not admin:
        admin = User()
        admin.username = 'audit-admin'
        admin.email = 'audit-admin@x.test'
        admin.set_password('admin123')
        admin.role = 'admin'
        session.add(admin)
        session.commit()
    return admin


def test_audit_list_endpoint(client):
    with client.application.app_context():
        admin = ensure_admin(db.session)
        # create a log entry
        log_activity(admin.id, 'test_action', 'test_entity', entity_id='e1', details={'foo': 'bar'})
        token = create_access_token(identity=admin.id)

    res = client.get('/api/audit', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200
    body = res.get_json()
    assert body['success'] is True
    assert any(it['action'] == 'test_action' for it in body['data'])
