"""
Create Tenant User - Pure SQLAlchemy (FastAPI Compatible)
"""
import sys
import os
sys.path.append(os.path.dirname(__file__))

from database import SessionLocal
from models.user import User
from models.tenant import Tenant
import uuid

def create_tenant_user():
    db = SessionLocal()
    try:
        # Get Tenant
        tenant = db.query(Tenant).filter_by(slug="tenant-1").first()
        if not tenant:
            print("Tenant not found! Creating one...")
            tenant = Tenant(
                name="Tenant 1",
                slug="tenant-1",
                owner_email="admin@x-ear.com",
                billing_email="billing@x-ear.com"
            )
            db.add(tenant)
            db.commit()
            print(f"Created tenant: {tenant.id}")

        # Check if user exists
        # Note: compehensive_api_test.py uses admin@x-ear.com for BOTH admin and user login
        # So we should probably ensure admin@x-ear.com exists in the User table too for simplicity of that test script.
        target_email = "admin@x-ear.com" 
        
        user = db.query(User).filter_by(email=target_email).first()
        if user:
            print(f"User {user.email} already exists. Resetting password and active status...")
            user.set_password("password123")
            user.is_active = True
            user.tenant_id = tenant.id
            user.first_name = "Admin"
            user.last_name = "User"
            db.commit()
            print("User updated.")
        else:
            print(f"Creating {target_email} in User table...")
            user = User(
                email=target_email,
                username="admin_user", # Username for CRM login
                first_name="Admin",
                last_name="User",
                role="admin",  # Tenant Admin
                tenant_id=tenant.id,
                is_active=True
            )
            user.set_password("password123")
            db.add(user)
            db.commit()
            print(f"Created user {user.email} in tenant {tenant.id}")
            
    finally:
        db.close()

if __name__ == "__main__":
    create_tenant_user()
