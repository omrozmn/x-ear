
import sys
import os

# Add backend root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from core.database import SessionLocal, unbound_session
from core.models.user import User
from core.models.tenant import Tenant
import uuid

def fix_permissions():
    print("Fixing test user permissions (Pure SQLAlchemy)...")
    db = SessionLocal()
    
    try:
        # Bypass tenant filter to find user globally
        with unbound_session(reason="fix-test-permissions"):
            phone = '+905551234567'
            user = db.query(User).filter_by(phone=phone).first()
            
            if not user:
                print(f"User with phone {phone} not found!")
                
                # Check for tenant
                tenant = db.query(Tenant).first()
                if not tenant:
                    print("No tenant found, creating default tenant")
                    tenant = Tenant(id=str(uuid.uuid4()), name="Test Tenant", domain="test")
                    db.add(tenant)
                    db.commit()
                
                print(f"Creating test user in tenant {tenant.id}...")
                user = User(
                    username='test_admin',
                    email='test_admin@x-ear.com',
                    phone=phone,
                    tenant_id=tenant.id,
                    first_name='Test',
                    last_name='Admin',
                    is_active=True,
                    role='admin'
                )
                user.set_password('123456')
                db.add(user)
                db.commit()
                print("Test user created with role 'admin'")
            else:
                print(f"User found: {user.username}, Role: {user.role}")
                if user.role != 'admin':
                    user.role = 'admin'
                    db.commit()
                    print("Updated user role to 'admin'")
                else:
                    print("User already has 'admin' role")
                
                # Explicitly set active
                if not user.is_active:
                    user.is_active = True
                    db.commit()
                    print("Activated user")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()
        print("Done.")

if __name__ == '__main__':
    fix_permissions()
