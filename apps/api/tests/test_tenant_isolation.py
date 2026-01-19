"""
Unit tests for tenant isolation and automatic global filtering
"""
import pytest
from app import app, db
from models.user import User
from models.patient import Patient
from models.tenant import Tenant
from utils.tenant_security import set_current_tenant_id, UnboundSession
import uuid


@pytest.fixture
def test_client():
    """Create test client"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def tenants_and_data():
    """Create test tenants and data"""
    with app.app_context():
        suffix = str(uuid.uuid4())[:8]
        
        # Create tenants
        t1 = Tenant(name=f"Tenant1_{suffix}", slug=f"t1_{suffix}", 
                   owner_email=f"t1_{suffix}@test.com", billing_email=f"t1_{suffix}@test.com")
        t2 = Tenant(name=f"Tenant2_{suffix}", slug=f"t2_{suffix}", 
                   owner_email=f"t2_{suffix}@test.com", billing_email=f"t2_{suffix}@test.com")
        db.session.add_all([t1, t2])
        db.session.commit()
        
        # Create users
        u1 = User(username=f"user1_{suffix}", email=f"user1_{suffix}@test.com", tenant_id=t1.id)
        u1.set_password("pass123")
        u2 = User(username=f"user2_{suffix}", email=f"user2_{suffix}@test.com", tenant_id=t2.id)
        u2.set_password("pass456")
        db.session.add_all([u1, u2])
        db.session.commit()
        
        # Create patients
        p1 = Patient(first_name="John", last_name="Doe", phone=f"111_{suffix}", tenant_id=t1.id)
        p2 = Patient(first_name="Jane", last_name="Smith", phone=f"222_{suffix}", tenant_id=t2.id)
        p3 = Patient(first_name="Bob", last_name="Johnson", phone=f"333_{suffix}", tenant_id=t1.id)
        db.session.add_all([p1, p2, p3])
        db.session.commit()
        
        yield {
            'tenants': (t1, t2),
            'users': (u1, u2),
            'patients': (p1, p2, p3)
        }


def test_session_get_correct_tenant(tenants_and_data):
    """Test that session.get() returns object for correct tenant"""
    with app.app_context():
        t1, t2 = tenants_and_data['tenants']
        u1, u2 = tenants_and_data['users']
        
        # Set tenant context to t1
        set_current_tenant_id(t1.id)
        
        # Should find user from t1
        user = db.session.get(User, u1.id)
        assert user is not None
        assert user.id == u1.id


def test_session_get_wrong_tenant(tenants_and_data):
    """Test that session.get() returns None for wrong tenant"""
    with app.app_context():
        t1, t2 = tenants_and_data['tenants']
        u1, u2 = tenants_and_data['users']
        
        # Set tenant context to t2
        set_current_tenant_id(t2.id)
        
        # Should NOT find user from t1
        user = db.session.get(User, u1.id)
        assert user is None


def test_query_filtering(tenants_and_data):
    """Test that Model.query auto-filters by tenant"""
    with app.app_context():
        t1, t2 = tenants_and_data['tenants']
        p1, p2, p3 = tenants_and_data['patients']
        
        # Query for t1 - should get 2 patients (p1, p3)
        set_current_tenant_id(t1.id)
        patients_t1 = Patient.query.all()
        patient_ids_t1 = [p.id for p in patients_t1]
        assert p1.id in patient_ids_t1
        assert p3.id in patient_ids_t1
        assert p2.id not in patient_ids_t1
        
        # Query for t2 - should get 1 patient (p2)
        set_current_tenant_id(t2.id)
        patients_t2 = Patient.query.all()
        patient_ids_t2 = [p.id for p in patients_t2]
        assert p2.id in patient_ids_t2
        assert p1.id not in patient_ids_t2
        assert p3.id not in patient_ids_t2


def test_unbound_session(tenants_and_data):
    """Test that UnboundSession bypasses tenant filter"""
    with app.app_context():
        t1, t2 = tenants_and_data['tenants']
        u1, u2 = tenants_and_data['users']
        
        # Set tenant context
        set_current_tenant_id(t1.id)
        
        # With UnboundSession, should see all users
        with UnboundSession():
            users = User.query.all()
            user_ids = [u.id for u in users]
            assert u1.id in user_ids
            assert u2.id in user_ids


def test_no_tenant_context(tenants_and_data):
    """Test behavior when no tenant context is set"""
    with app.app_context():
        u1, u2 = tenants_and_data['users']
        
        # No tenant set - use token-based reset instead of set_current_tenant_id(None)
        token = _current_tenant_id.set(None)
        try:
            # Should still work but return unfiltered results
            user = db.session.get(User, u1.id)
            assert user is not None
        finally:
            _current_tenant_id.reset(token)


def test_tenant_isolation_comprehensive(tenants_and_data):
    """Comprehensive test for tenant isolation"""
    with app.app_context():
        t1, t2 = tenants_and_data['tenants']
        u1, u2 = tenants_and_data['users']
        p1, p2, p3 = tenants_and_data['patients']
        
        # Test 1: Tenant 1 can only see their data
        set_current_tenant_id(t1.id)
        assert db.session.get(User, u1.id) is not None
        assert db.session.get(User, u2.id) is None
        assert len(Patient.query.all()) == 2  # p1 and p3
        
        # Test 2: Tenant 2 can only see their data
        set_current_tenant_id(t2.id)
        assert db.session.get(User, u2.id) is not None
        assert db.session.get(User, u1.id) is None
        assert len(Patient.query.all()) == 1  # p2 only
        
        # Test 3: Unbound sees everything
        with UnboundSession():
            all_users = User.query.all()
            assert len([u for u in all_users if u.id in [u1.id, u2.id]]) == 2
