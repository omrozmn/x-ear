from app import app, db
from models.user import User
from models.patient import Patient
from models.tenant import Tenant
from utils.tenant_security import set_current_tenant_id, UnboundSession
from core.database import _current_tenant_id
import uuid

def test_filter():
    with app.app_context():
        # Setup data
        suffix = str(uuid.uuid4())[:8]
        t1 = Tenant(name=f"T1_{suffix}", slug=f"t1_{suffix}", owner_email=f"t1_{suffix}@x.com", billing_email=f"t1_{suffix}@x.com")
        t2 = Tenant(name=f"T2_{suffix}", slug=f"t2_{suffix}", owner_email=f"t2_{suffix}@x.com", billing_email=f"t2_{suffix}@x.com")
        db.session.add_all([t1, t2])
        db.session.commit()
        
        u1 = User(username=f"u1_{suffix}", email=f"u1_{suffix}@x.com", tenant_id=t1.id)
        u1.set_password("test123")
        u2 = User(username=f"u2_{suffix}", email=f"u2_{suffix}@x.com", tenant_id=t2.id)
        u2.set_password("test456")
        db.session.add_all([u1, u2])
        db.session.commit()
        
        p1 = Patient(first_name="P1", last_name="T1", phone=f"111_{suffix}", tenant_id=t1.id)
        p2 = Patient(first_name="P2", last_name="T2", phone=f"222_{suffix}", tenant_id=t2.id)
        db.session.add_all([p1, p2])
        db.session.commit()
        
        print(f"Created:")
        print(f"  User {u1.id} (Tenant {t1.id})")
        print(f"  User {u2.id} (Tenant {t2.id})")
        print(f"  Patient {p1.id} (Tenant {t1.id})")
        print(f"  Patient {p2.id} (Tenant {t2.id})")
        
        # Test 1: UnboundSession (Super Admin view)
        print("\n=== Test 1: UnboundSession ===")
        token = _current_tenant_id.set(None)
        try:
            with UnboundSession():
                users_all = User.query.all()
                print(f"Unfiltered query: {len(users_all)} users")
                assert len(users_all) >= 2
                
                user_get = db.session.get(User, u1.id)
                print(f"Unfiltered get: {user_get}")
                assert user_get is not None
        finally:
            _current_tenant_id.reset(token)
        
        # Test 2: Correct tenant context - session.get()
        print("\n=== Test 2: Correct Tenant (get) ===")
        set_current_tenant_id(t1.id)
        user_filtered_ok = db.session.get(User, u1.id)
        print(f"Tenant {t1.id} get User {u1.id}: {user_filtered_ok}")
        assert user_filtered_ok is not None, "Should find user in correct tenant"
        
        # Test 3: Wrong tenant context - session.get()
        print("\n=== Test 3: Wrong Tenant (get) ===")
        set_current_tenant_id(t2.id)
        user_filtered_wrong = db.session.get(User, u1.id)  # u1 belongs to t1, not t2
        print(f"Tenant {t2.id} get User {u1.id}: {user_filtered_wrong}")
        assert user_filtered_wrong is None, "Should NOT find user from different tenant"
        
        # Test 4: Query filtering
        print("\n=== Test 4: Query Filtering ===")
        set_current_tenant_id(t1.id)
        patients_t1 = Patient.query.all()
        print(f"Tenant {t1.id} patients: {[p.id for p in patients_t1]}")
        assert len(patients_t1) == 1
        assert patients_t1[0].id == p1.id
        
        set_current_tenant_id(t2.id)
        patients_t2 = Patient.query.all()
        print(f"Tenant {t2.id} patients: {[p.id for p in patients_t2]}")
        assert len(patients_t2) == 1
        assert patients_t2[0].id == p2.id
        
        print("\n✅ All tests passed!")

if __name__ == "__main__":
    try:
        test_filter()
    except AssertionError as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
    except Exception as e:
        print(f"❌ Test error: {e}")
        import traceback
        traceback.print_exc()

