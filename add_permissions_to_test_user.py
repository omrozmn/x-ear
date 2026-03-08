#!/usr/bin/env python3

import sys
import os
import logging

# Suppress logging
logging.getLogger().setLevel(logging.CRITICAL)
os.environ['SQLALCHEMY_ECHO'] = 'false'

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps/api'))

from core.database import SessionLocal
from core.models.user import User
from core.models.role import Role

def add_permissions_to_test_user():
    """Add necessary permissions to test user"""
    print("🔧 Adding permissions to test user")
    
    db = SessionLocal()
    try:
        # Find test user
        user = db.query(User).filter_by(email="apitest@xear.com").first()
        if not user:
            print("❌ Test user not found")
            return False
        
        print(f"✅ Found test user: {user.email}")
        
        # Check if user has admin role or create one
        admin_role = db.query(Role).filter_by(name="admin", tenant_id=user.tenant_id).first()
        if not admin_role:
            print("Creating admin role...")
            admin_role = Role(
                id=f"role_admin_{user.tenant_id[:8]}",
                name="admin",
                tenant_id=user.tenant_id,
                permissions=["sale:read", "sale:write", "sale:create", "sale:delete", "parties:read", "parties:write"]
            )
            db.add(admin_role)
        
        # Update user role
        user.role = "admin"
        
        # Ensure permissions are set
        required_permissions = [
            "sale:read", "sale:write", "sale:create", "sale:delete",
            "parties:read", "parties:write", "parties:create", "parties:delete"
        ]
        
        # Update role permissions
        admin_role.permissions = required_permissions
        
        db.commit()
        
        print(f"✅ Updated user role to admin with permissions: {required_permissions}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to add permissions: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = add_permissions_to_test_user()
    if not success:
        exit(1)