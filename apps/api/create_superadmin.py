#!/usr/bin/env python3
"""
Create or reset superadmin user for X-Ear CRM
Usage: python create_superadmin.py
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from core.database import SessionLocal, init_db
from models.admin_user import AdminUser
from werkzeug.security import generate_password_hash
import uuid
from datetime import datetime, timezone


def create_superadmin():
    """Create or reset superadmin user"""
    
    # Initialize database tables if needed
    init_db()
    
    db = SessionLocal()
    try:
        # Check if admin exists
        admin = db.query(AdminUser).filter_by(email="admin@x-ear.com").first()
        
        if admin:
            print(f"✅ Found existing admin user: {admin.email}")
            print(f"   ID: {admin.id}")
            print(f"   Role: {admin.role}")
            print(f"   Active: {admin.is_active}")
            
            # Reset password
            admin.password_hash = generate_password_hash("admin123", method='pbkdf2:sha256')
            admin.is_active = True
            admin.updated_at = datetime.now(timezone.utc)
            db.commit()
            
            print("\n🔑 Password reset to: admin123")
            print("\n📧 Login credentials:")
            print(f"   Email: admin@x-ear.com")
            print(f"   Password: admin123")
            
        else:
            print("❌ Admin user not found. Creating new superadmin...")
            
            # Create new admin
            admin = AdminUser(
                id=str(uuid.uuid4()),
                email="admin@x-ear.com",
                password_hash=generate_password_hash("admin123", method='pbkdf2:sha256'),
                first_name="Super",
                last_name="Admin",
                role="super_admin",
                is_active=True,
                mfa_enabled=False,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            
            db.add(admin)
            db.commit()
            
            print(f"\n✅ Created superadmin user!")
            print(f"   ID: {admin.id}")
            print(f"   Email: {admin.email}")
            print(f"   Role: {admin.role}")
            
            print("\n🔑 Login credentials:")
            print(f"   Email: admin@x-ear.com")
            print(f"   Password: admin123")
        
        print("\n" + "="*50)
        print("🚀 You can now login to:")
        print("   Admin Panel: http://localhost:8082")
        print("   Web App: http://localhost:8080")
        print("="*50)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    create_superadmin()
