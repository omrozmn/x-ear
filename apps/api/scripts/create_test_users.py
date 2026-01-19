#!/usr/bin/env python3
"""
Create test users for E2E tests
- invalid_user: For testing invalid credentials
- unverified_phone_user: User with phone set but not verified
- no_phone_user: User without phone number
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Override DATABASE_URL to use correct database
os.environ['DATABASE_URL'] = 'sqlite:///xear_crm.db'

from core.database import SessionLocal, unbound_session
from core.models.user import User
from core.models.tenant import Tenant

def create_test_users():
    """Create test users for E2E tests"""
    db = SessionLocal()
    
    try:
        # Use unbound_session to bypass tenant filter for admin operations
        with unbound_session(reason="create-test-users-for-e2e"):
            # Get or create test tenant
            test_tenant = db.query(Tenant).filter_by(name='Test Tenant').first()
            if not test_tenant:
                test_tenant = Tenant(
                    name='Test Tenant',
                    subdomain='test',
                    is_active=True
                )
                db.add(test_tenant)
                db.commit()
                print(f"✅ Created test tenant: {test_tenant.id}")
            else:
                print(f"✅ Test tenant exists: {test_tenant.id}")
            
            # 1. User with unverified phone
            unverified_user = db.query(User).filter_by(username='unverified_phone_user').first()
            if not unverified_user:
                unverified_user = User(
                    username='unverified_phone_user',
                    email='unverified@test.com',
                    phone='5551234567',
                    tenant_id=test_tenant.id,
                    first_name='Unverified',
                    last_name='Phone',
                    role='user',
                    is_active=True,
                    is_phone_verified=False  # Phone set but NOT verified
                )
                unverified_user.set_password('testpass123')
                db.add(unverified_user)
                print(f"✅ Created user: unverified_phone_user (phone: 5551234567, verified: False)")
            else:
                # Update existing user
                unverified_user.phone = '5551234567'
                unverified_user.is_phone_verified = False
                unverified_user.set_password('testpass123')
                print(f"✅ Updated user: unverified_phone_user")
            
            # 2. User without phone number
            no_phone_user = db.query(User).filter_by(username='no_phone_user').first()
            if not no_phone_user:
                no_phone_user = User(
                    username='no_phone_user',
                    email='nophone@test.com',
                    phone=None,  # No phone number
                    tenant_id=test_tenant.id,
                    first_name='No',
                    last_name='Phone',
                    role='user',
                    is_active=True,
                    is_phone_verified=False
                )
                no_phone_user.set_password('testpass123')
                db.add(no_phone_user)
                print(f"✅ Created user: no_phone_user (phone: None)")
            else:
                # Update existing user
                no_phone_user.phone = None
                no_phone_user.is_phone_verified = False
                no_phone_user.set_password('testpass123')
                print(f"✅ Updated user: no_phone_user")
            
            # 3. User for invalid credentials test (valid user to test wrong password)
            invalid_user = db.query(User).filter_by(username='invalid_user').first()
            if not invalid_user:
                invalid_user = User(
                    username='invalid_user',
                    email='invalid@test.com',
                    phone='5559999999',
                    tenant_id=test_tenant.id,
                    first_name='Invalid',
                    last_name='User',
                    role='user',
                    is_active=True,
                    is_phone_verified=True
                )
                invalid_user.set_password('correctpassword')
                db.add(invalid_user)
                print(f"✅ Created user: invalid_user (for testing wrong password)")
            else:
                invalid_user.set_password('correctpassword')
                print(f"✅ Updated user: invalid_user")
            
            # 4. Regular test user with verified phone
            testuser = db.query(User).filter_by(username='testuser').first()
            if not testuser:
                testuser = User(
                    username='testuser',
                    email='testuser@test.com',
                    phone='5558888888',
                    tenant_id=test_tenant.id,
                    first_name='Test',
                    last_name='User',
                    role='user',
                    is_active=True,
                    is_phone_verified=True  # Verified phone
                )
                testuser.set_password('testpass123')
                db.add(testuser)
                print(f"✅ Created user: testuser (phone verified)")
            else:
                testuser.is_phone_verified = True
                testuser.set_password('testpass123')
                print(f"✅ Updated user: testuser")
            
            db.commit()
            
            print("\n" + "="*60)
            print("✅ Test users created successfully!")
            print("="*60)
            print("\nTest Users:")
            print(f"1. unverified_phone_user / testpass123 (phone: 5551234567, verified: False)")
            print(f"2. no_phone_user / testpass123 (phone: None)")
            print(f"3. invalid_user / correctpassword (for wrong password test)")
            print(f"4. testuser / testpass123 (phone verified)")
            print(f"\nTenant ID: {test_tenant.id}")
            print("="*60)
    
    finally:
        db.close()

if __name__ == '__main__':
    create_test_users()
