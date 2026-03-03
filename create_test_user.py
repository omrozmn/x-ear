#!/usr/bin/env python3

import sys
import os
import logging
from passlib.context import CryptContext

# Suppress logging
logging.getLogger().setLevel(logging.CRITICAL)
os.environ['SQLALCHEMY_ECHO'] = 'false'

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps/api'))

from core.database import SessionLocal
from core.models.user import User

def create_test_user():
    """Create a test user with known credentials"""
    print("🧪 Creating test user for API testing")
    
    db = SessionLocal()
    try:
        # Check if test user already exists
        existing_user = db.query(User).filter_by(email="apitest@xear.com").first()
        if existing_user:
            print(f"✅ Test user already exists: {existing_user.email}")
            return existing_user.email, "test123"
        
        # Create password hash
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        password = "test123"
        password_hash = pwd_context.hash(password)
        
        # Create new user
        user = User(
            id="usr_apitest123",
            tenant_id="95625589-a4ad-41ff-a99e-4955943bb421",
            username="apitest",
            email="apitest@xear.com",
            password_hash=password_hash,
            first_name="API",
            last_name="Test",
            is_active=True
        )
        
        db.add(user)
        db.commit()
        
        print(f"✅ Created test user: {user.email} with password: {password}")
        return user.email, password
        
    except Exception as e:
        print(f"❌ Failed to create test user: {e}")
        return None, None
    finally:
        db.close()

if __name__ == "__main__":
    email, password = create_test_user()
    if email and password:
        print(f"\n📋 Test credentials:")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
    else:
        exit(1)