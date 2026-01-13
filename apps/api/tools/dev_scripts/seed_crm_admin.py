"""Seed CRM admin user using application context and ORM.
This script creates a default tenant and a tenant admin user.
"""
import sys
import os
# Add backend root to path to allow imports from app, models, etc.
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
from importlib import import_module
import uuid
from datetime import datetime

# Import app from app (since we are in the same directory)
app_mod = import_module('app')
app = getattr(app_mod, 'app')

from models.base import db
from models.user import User
from models.tenant import Tenant, TenantStatus

def seed_crm_admin():
    with app.app_context():
        # 1. Ensure a default tenant exists
        tenant_slug = 'admin-tenant'
        tenant = Tenant.query.filter_by(slug=tenant_slug).first()
        
        if not tenant:
            print(f"Creating default tenant: {tenant_slug}")
            tenant = Tenant(
                id=str(uuid.uuid4()),
                name='Admin Tenant',
                slug=tenant_slug,
                description='Default admin tenant',
                owner_email='admin@x-ear.com',
                billing_email='admin@x-ear.com',
                status=TenantStatus.ACTIVE.value,
                max_users=10,
                current_users=0
            )
            db.session.add(tenant)
            db.session.commit()
        else:
            print(f"Using existing tenant: {tenant.name} ({tenant.id})")
            
        # 2. Create/Update the admin user
        admin_email = 'admin@x-ear.com'
        admin_username = 'admin'
        
        user = User.query.filter((User.email == admin_email) | (User.username == admin_username)).first()
        
        if user:
            print(f"Updating existing user: {admin_email}")
            user.email = admin_email
            user.username = admin_username
            user.tenant_id = tenant.id
            user.role = 'tenant_admin'
            user.first_name = 'Super'
            user.last_name = 'Admin (CRM)'
            user.is_active = True
            user.set_password('admin123')
            user.updated_at = datetime.utcnow()
        else:
            print(f"Creating new user: {admin_email}")
            user = User(
                username=admin_username,
                email=admin_email,
                tenant_id=tenant.id,
                role='tenant_admin',
                first_name='Super',
                last_name='Admin (CRM)',
                is_active=True
            )
            user.set_password('admin123')
            db.session.add(user)
            
            # Increment tenant user count
            tenant.current_users = (tenant.current_users or 0) + 1
            
        db.session.commit()
        print(f"CRM Admin user seeded: {admin_email} / admin123")

if __name__ == '__main__':
    seed_crm_admin()
