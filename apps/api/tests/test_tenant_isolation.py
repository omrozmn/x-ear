import pytest
import uuid
from core.database import set_current_tenant_id, _current_tenant_id
from core.models.base import db
from core.models.user import User
from core.models.party import Party
from core.models.tenant import Tenant
from utils.tenant_security import UnboundSession

@pytest.fixture
def tenants_and_data(db_session):
    suffix = str(uuid.uuid4())[:8]
    
    # Create tenants
    t1 = Tenant(id=f"t1_{suffix}", name=f"Tenant1_{suffix}", slug=f"t1_{suffix}", 
               owner_email=f"t1_{suffix}@test.com", billing_email=f"t1_{suffix}@test.com", is_active=True)
    t2 = Tenant(id=f"t2_{suffix}", name=f"Tenant2_{suffix}", slug=f"t2_{suffix}", 
               owner_email=f"t2_{suffix}@test.com", billing_email=f"t2_{suffix}@test.com", is_active=True)
    db_session.add_all([t1, t2])
    db_session.commit()
    
    # Create users
    u1 = User(id=f"u1_{suffix}", username=f"user1_{suffix}", email=f"user1_{suffix}@test.com", tenant_id=t1.id, is_active=True)
    u1.set_password("pass123")
    u2 = User(id=f"u2_{suffix}", username=f"user2_{suffix}", email=f"user2_{suffix}@test.com", tenant_id=t2.id, is_active=True)
    u2.set_password("pass456")
    db_session.add_all([u1, u2])
    db_session.commit()
    
    # Create parties (patients)
    p1 = Party(id=f"p1_{suffix}", first_name="John", last_name="Doe", phone=f"111_{suffix}", tenant_id=t1.id)
    p2 = Party(id=f"p2_{suffix}", first_name="Jane", last_name="Smith", phone=f"222_{suffix}", tenant_id=t2.id)
    p3 = Party(id=f"p3_{suffix}", first_name="Bob", last_name="Johnson", phone=f"333_{suffix}", tenant_id=t1.id)
    db_session.add_all([p1, p2, p3])
    db_session.commit()
    
    return {
        'tenants': (t1, t2),
        'users': (u1, u2),
        'patients': (p1, p2, p3)
    }


def test_session_get_correct_tenant(db_session, tenants_and_data):
    t1, t2 = tenants_and_data['tenants']
    u1, u2 = tenants_and_data['users']
    
    # Set tenant context to t1
    set_current_tenant_id(t1.id)
    db_session.expunge_all()
    
    # Should find user from t1
    user = db_session.get(User, u1.id)
    assert user is not None
    assert user.id == u1.id


def test_session_get_wrong_tenant(db_session, tenants_and_data):
    t1, t2 = tenants_and_data['tenants']
    u1, u2 = tenants_and_data['users']
    
    # Set tenant context to t2
    set_current_tenant_id(t2.id)
    db_session.expunge_all()
    
    # Should NOT find user from t1 (TenantAwareSession should return None)
    user = db_session.get(User, u1.id)
    assert user is None


def test_query_filtering(db_session, tenants_and_data):
    t1, t2 = tenants_and_data['tenants']
    p1, p2, p3 = tenants_and_data['patients']
    
    # Query for t1 - should get 2 patients (p1, p3)
    set_current_tenant_id(t1.id)
    patients_t1 = db_session.query(Party).all()
    patient_ids_t1 = [p.id for p in patients_t1]
    assert p1.id in patient_ids_t1
    assert p3.id in patient_ids_t1
    assert p2.id not in patient_ids_t1
    
    # Query for t2 - should get 1 patient (p2)
    set_current_tenant_id(t2.id)
    patients_t2 = db_session.query(Party).all()
    patient_ids_t2 = [p.id for p in patients_t2]
    assert p2.id in patient_ids_t2
    assert p1.id not in patient_ids_t2
    assert p3.id not in patient_ids_t2


def test_unbound_session(db_session, tenants_and_data):
    t1, t2 = tenants_and_data['tenants']
    u1, u2 = tenants_and_data['users']
    
    # Set tenant context
    set_current_tenant_id(t1.id)
    
    # With UnboundSession, should see all users
    with UnboundSession():
        users = db_session.query(User).all()
        user_ids = [u.id for u in users]
        assert u1.id in user_ids
        assert u2.id in user_ids


def test_no_tenant_context(db_session, tenants_and_data):
    u1, u2 = tenants_and_data['users']
    
    # No tenant set - use token-based reset instead of set_current_tenant_id(None)
    token = _current_tenant_id.set(None)
    db_session.expunge_all()
    try:
        # Should still work but return unfiltered results
        user = db_session.get(User, u1.id)
        assert user is not None
    finally:
        _current_tenant_id.reset(token)
