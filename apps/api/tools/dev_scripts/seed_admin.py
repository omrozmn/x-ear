"""
Seed Admin User - Pure SQLAlchemy (No Flask)
"""
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from database import SessionLocal
from models.admin_user import AdminUser
import uuid

def seed_admin():
    print("Seeding admin user...")
    email = "admin@x-ear.com"
    
    db = SessionLocal()
    try:
        # Check if already exists
        existing = db.query(AdminUser).filter_by(email=email).first()
        if existing:
            print(f"Admin user {email} already exists.")
            return

        # Create new admin
        admin = AdminUser(
            id=str(uuid.uuid4()),
            email=email,
            first_name="Admin",
            last_name="User",
            role="super_admin",
            is_active=True
        )
        admin.set_password("password123")
        
        db.add(admin)
        db.commit()
        print(f"✅ Successfully created admin user: {email} / password123")
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin()
