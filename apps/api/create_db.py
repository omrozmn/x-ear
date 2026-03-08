#!/usr/bin/env python3
"""Create database tables and seed admin user + test tenant"""
import sys
import os
from datetime import datetime, timezone
from uuid import uuid4

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from werkzeug.security import generate_password_hash

from core.database import engine, Base, get_db
from core.models.admin_user import AdminUser
from core.models.tenant import Tenant

def hash_password(password: str) -> str:
    """Hash password using Werkzeug (same as AdminUser.set_password)"""
    return generate_password_hash(password, method='pbkdf2:sha256')

def create_tables():
    """Create all tables"""
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("✓ Tables created")

def seed_admin_user():
    """Create admin user"""
    db = next(get_db())
    try:
        # Check if admin exists
        existing = db.query(AdminUser).filter_by(email="admin@xear.com").first()
        if existing:
            print("✓ Admin user already exists")
            return
        
        admin = AdminUser(
            id=str(uuid4()),
            email="admin@xear.com",
            password_hash=hash_password("admin123"),
            first_name="Admin",
            last_name="User",
            role="super_admin",
            is_active=True,
            mfa_enabled=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db.add(admin)
        db.commit()
        print(f"✓ Admin user created: {admin.email}")
    finally:
        db.close()

def seed_test_tenant():
    """Create test tenant"""
    db = next(get_db())
    try:
        tenant_id = "938ab3ec-192a-4f89-8a63-6941212e2f2a"
        
        # Check if tenant exists
        existing = db.query(Tenant).filter_by(id=tenant_id).first()
        if existing:
            print("✓ Test tenant already exists")
            return
        
        tenant = Tenant(
            id=tenant_id,
            name="Test Clinic",
            slug="test-clinic",
            owner_email="test@xear.com",
            billing_email="test@xear.com",
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db.add(tenant)
        db.commit()
        print(f"✓ Test tenant created: {tenant.name} ({tenant.id})")
    finally:
        db.close()

if __name__ == "__main__":
    create_tables()
    seed_admin_user()
    seed_test_tenant()
    print("\n✅ Database setup complete!")
