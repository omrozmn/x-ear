import pytest
import uuid
from datetime import datetime, timezone
from core.models.user import User, ActivityLog

def test_audit_list_endpoint(client, db_session, auth_headers):
    # Get user id from admin fixture
    admin_user = db_session.query(User).filter_by(role='admin').first()
    if not admin_user:
        pytest.skip("No admin user found")
    
    # create a log entry directly
    log = ActivityLog(
        id=str(uuid.uuid4()),
        user_id=admin_user.id,
        action='test_action',
        entity_type='test_entity',
        entity_id='e1',
        message='Test audit log message',
        details_json={'foo': 'bar'},
        tenant_id='tenant-1',
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(log)
    db_session.commit()

    # The router might be using /api/audit or /api/activity-logs
    # Based on routers/audit.py, it's prefix="/api/audit"
    res = client.get('/api/audit', headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body['success'] is True
    assert any(it['action'] == 'test_action' for it in body['data'])
