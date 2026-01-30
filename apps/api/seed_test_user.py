#!/usr/bin/env python3
"""Seed test user for simple-login.spec.ts"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from core.database import get_db, init_db
from core.models.admin_user import AdminUser
from werkzeug.security import generate_password_hash
import uuid
from dotenv import load_dotenv

# Load .env explicitly
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

def seed_test_user():
    print("🔄 Initializing database (create_all)...")
    init_db()
    db = next(get_db())
    
    # Identifier used in simple-login.spec.ts
    identifier = 'admin@x-ear.com'
    password = 'password123'
    
    # Check if exists
    existing = db.query(AdminUser).filter_by(email=identifier).first()
    
    if existing:
        print(f"✅ User already exists: {existing.email}")
        existing.password_hash = generate_password_hash(password, method='pbkdf2:sha256')
        db.commit()
        print(f"✅ Password updated to: {password}")
    else:
        user = AdminUser(
            id=f'usr_test_{uuid.uuid4()}',
            email=identifier, # Backend login checks email column
            password_hash=generate_password_hash(password, method='pbkdf2:sha256'),
            first_name='Test',
            last_name='User',
            role='super_admin',
            is_active=True
        )
        db.add(user)
        db.commit()
        print(f"✅ Created user: {user.email}")

if __name__ == '__main__':
    seed_test_user()
