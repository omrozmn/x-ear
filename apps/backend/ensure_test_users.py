
from app import app
from models.base import db
from models.admin_user import AdminUser
from models.user import User
from models.tenant import Tenant
import uuid

def ensure_users():
    with app.app_context():
        # 1. Admin User
        admin = AdminUser.query.filter_by(email='admin@xear.com').first()
        if not admin:
            print("Creating admin@xear.com")
            admin = AdminUser(
                id=str(uuid.uuid4()),
                email='admin@xear.com',
                first_name='Super',
                last_name='Admin',
                role='super_admin', # or admin
                is_active=True
            )
            db.session.add(admin)
        
        admin.set_password('password')
        admin.role = 'super_admin' # Ensure super admin role
        db.session.commit()
        print("Admin user ready (password: password)")
        
        # 2. Tenant & Tenant User
        tenant = Tenant.query.filter_by(name='Demo Tenant').first()
        if not tenant:
            tenant = Tenant(
                name='Demo Tenant',
                slug='demo-tenant',
                owner_email='admin@demo.com',
                billing_email='billing@demo.com',
                status='active'
            )
            # Remove subscription_status if not in model, earlier I saw status='active' (enum value)
            # Checking model: status is Enum or String. default=TenantStatus.TRIAL.value
            # no subscription_status field visible in view_file output.
            
            # Correction based on view_file output:
            # status = Column(String(20), default=TenantStatus.TRIAL.value...)
            # subscription_status is NOT in the model shown (lines 1-111).
            # It has subscription_start_date, etc.
            
            tenant = Tenant(
                name='Demo Tenant',
                slug='demo-tenant',
                owner_email='admin@demo.com',
                billing_email='billing@demo.com',
                status='active'
            )
            db.session.add(tenant)
            db.session.commit()
            print("Demo Tenant created")
            
        user = User.query.filter_by(email='user@koc.com').first()
        if not user:
            print("Creating user@koc.com")
            user = User(
                id=str(uuid.uuid4()),
                email='user@koc.com',
                username='demo_user',
                first_name='Demo',
                last_name='User',
                tenant_id=tenant.id,
                role='user',
                is_active=True
            )
            db.session.add(user)
            
        user.set_password('password')
        # Ensure user has no branches assigned for general testing, or we test branch filter with assigned ones
        # For now assume global tenant access for this user
        db.session.commit()
        print("Tenant User ready (password: password)")

if __name__ == '__main__':
    ensure_users()
