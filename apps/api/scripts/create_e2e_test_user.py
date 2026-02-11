#!/usr/bin/env python3
"""Create E2E test user with known credentials"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.database import SessionLocal
from core.models.user import User
from core.models.tenant import Tenant
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_test_user():
    db = SessionLocal()
    try:
        # Get or create test tenant
        tenant = db.query(Tenant).filter_by(name="Test Clinic").first()
        if not tenant:
            tenant = Tenant(
                id="test-tenant-001",
                name="Test Clinic",
                is_active=True
            )
            db.add(tenant)
            db.commit()
            print(f"✅ Created tenant: {tenant.name}")
        
        # Check if user exists
        existing = db.query(User).filter_by(username="e2etest").first()
        if existing:
            # Update password
            existing.password_hash = pwd_context.hash("Test123!")
            existing.is_active = True
            existing.is_phone_verified = True
            db.commit()
            print(f"✅ Updated existing user: e2etest")
        else:
            # Create new user
            user = User(
                username="e2etest",
                email="e2etest@xear.com",
                password_hash=pwd_context.hash("Test123!"),
                tenant_id=tenant.id,
                is_active=True,
                is_phone_verified=True,
                phone="+905551112233"
            )
            db.add(user)
            db.commit()
            print(f"✅ Created user: e2etest")
        
        print("\n📋 E2E Test Credentials:")
        print("Username: e2etest")
        print("Password: Test123!")
        print("Email: e2etest@xear.com")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_user()
