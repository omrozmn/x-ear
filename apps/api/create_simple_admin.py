#!/usr/bin/env python3
"""Create simple admin user with admin@x-ear.com / admin123"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from core.database import get_db
from core.models.admin_user import AdminUser
from werkzeug.security import generate_password_hash
import uuid

def create_simple_admin():
    db = next(get_db())
    
    # Check if admin exists
    existing = db.query(AdminUser).filter_by(email='admin@x-ear.com').first()
    
    if existing:
        print(f"✅ Admin already exists: {existing.email}")
        # Update password
        existing.password_hash = generate_password_hash('admin123', method='pbkdf2:sha256')
        db.commit()
        print("✅ Password updated to: admin123")
    else:
        # Create new admin
        admin = AdminUser(
            id=f'usr_admin_{uuid.uuid4()}',
            email='admin@x-ear.com',
            password_hash=generate_password_hash('admin123', method='pbkdf2:sha256'),
            first_name='Admin',
            last_name='User',
            role='super_admin',
            is_active=True
        )
        db.add(admin)
        db.commit()
        print(f"✅ Created admin: {admin.email}")
    
    print("\n🔐 Credentials:")
    print("   Email: admin@x-ear.com")
    print("   Password: admin123")
    print("   Login: http://localhost:8083")

if __name__ == '__main__':
    create_simple_admin()
