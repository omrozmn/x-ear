#!/usr/bin/env python3
"""
Sync admin_users to users table for unified login
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from core.database import SessionLocal, init_db, unbound_session
from models.admin_user import AdminUser
from models.user import User
from datetime import datetime, timezone
import uuid


def sync_admin_to_users():
    """Sync admin users to users table"""
    
    init_db()
    db = SessionLocal()
    
    try:
        with unbound_session(reason="admin-user-sync"):
            # Get all admin users
            admin_users = db.query(AdminUser).all()
            
            print(f"Found {len(admin_users)} admin users")
            
            for admin in admin_users:
                # Check if user already exists
                existing = db.query(User).filter_by(email=admin.email).first()
                
                if existing:
                    print(f"✅ User already exists: {admin.email}")
                    # Update password to match admin
                    existing.password_hash = admin.password_hash
                    existing.role = "SUPER_ADMIN"
                    existing.is_active = admin.is_active
                    db.commit()
                    print(f"   Updated password and role")
                else:
                    # Create new user
                    user = User(
                        id=f"usr_{uuid.uuid4().hex[:8]}",
                        username=admin.email.split('@')[0],
                        email=admin.email,
                        phone=None,
                        tenant_id="system",  # System tenant for super admins
                        password_hash=admin.password_hash,
                        first_name=admin.first_name,
                        last_name=admin.last_name,
                        role="SUPER_ADMIN",
                        is_active=admin.is_active,
                        is_phone_verified=True,
                        created_at=datetime.now(timezone.utc),
                        updated_at=datetime.now(timezone.utc)
                    )
                    
                    db.add(user)
                    db.commit()
                    
                    print(f"✅ Created user: {admin.email}")
                    print(f"   ID: {user.id}")
                    print(f"   Username: {user.username}")
                    print(f"   Role: {user.role}")
            
            print("\n" + "="*50)
            print("🎉 Sync complete!")
            print("="*50)
            print("\n🔑 You can now login with:")
            print("   Email: admin@x-ear.com")
            print("   Password: admin123")
            print("\n🚀 Try logging in at:")
            print("   http://localhost:8080")
            print("="*50)
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    sync_admin_to_users()
