#!/usr/bin/env python3
"""
Create E2E test user for Playwright tests
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.orm import Session
from core.database import get_db
from core.models import User, Tenant
from datetime import datetime
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_e2e_user():
    """Create E2E test user"""
    db = next(get_db())
    
    try:
        # Check if tenant exists
        tenant = db.query(Tenant).filter(Tenant.id == "test_tenant").first()
        if not tenant:
            tenant = Tenant(
                id="test_tenant",
                name="Test Klinik",
                slug="test-klinik",
                billing_email="test@xear.com",
                created_at=datetime.utcnow()
            )
            db.add(tenant)
            db.commit()
            print(f"✅ Created tenant: {tenant.name}")
        
        # Check if user exists
        user = db.query(User).filter(
            (User.email == "admin@xear.com") | (User.username == "e2etest")
        ).first()
        if user:
            print(f"⏭️  User already exists: {user.email}")
            # Update password
            user.password_hash = pwd_context.hash("Admin123!")
            user.email = "admin@xear.com"
            user.username = "e2etest"
            user.phone = "e2etest"
            db.commit()
            print(f"✅ Updated password for: {user.email}")
        else:
            # Create user
            user = User(
                email="admin@xear.com",
                username="e2etest",
                phone="e2etest",
                first_name="E2E",
                last_name="Test",
                password_hash=pwd_context.hash("Admin123!"),
                role="admin",
                tenant_id=tenant.id,
                is_active=True,
                is_phone_verified=True,
                created_at=datetime.utcnow()
            )
            db.add(user)
            db.commit()
            print(f"✅ Created user: {user.email}")
        
        print("\n✅ E2E user ready!")
        print(f"  Email: admin@xear.com")
        print(f"  Phone: e2etest")
        print(f"  Password: Admin123!")
        print(f"  Tenant: {tenant.id}")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_e2e_user()
