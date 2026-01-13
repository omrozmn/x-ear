
from app import app
from models.user import User
from models.admin_user import AdminUser
from models.affiliate_user import AffiliateUser
from models.tenant import Tenant
import uuid
from models.base import db
from services.affiliate_service import AffiliateService
from utils.tenant_security import _skip_filter

def verify_logins():
    with app.app_context():
        # 1. Admin Login
        print("\n--- Verifying Admin Login ---")
        admin = AdminUser.query.filter_by(email="admin@x-ear.com").first()
        if admin:
            is_valid = admin.check_password("password123")
            print(f"Admin User exists. Password Valid: {is_valid}")
        else:
            print("Admin User NOT found.")

        # 2. Tenant/CRM Login
        print("\n--- Verifying Tenant/CRM Login ---")
        _skip_filter.set(True)
        
        tenant_email = "crm_user@x-ear.com"
        user = User.query.filter_by(email=tenant_email).first()
        if not user:
            print("Creating test tenant/user...")
            try:
                # Create Tenant
                t = Tenant(
                    name="Test Clinic",
                    slug="test-clinic",
                    owner_email=tenant_email,
                    billing_email=tenant_email,
                    status="active"
                )
                db.session.add(t)
                db.session.flush()
                
                # Create User
                u = User(
                    email=tenant_email,
                    username="crm_user",
                    password_hash="", 
                    tenant_id=t.id,
                    role="tenant_admin",
                    is_active=True
                )
                u.set_password("password123")
                db.session.add(u)
                db.session.commit()
                print("Test Tenant User Created.")
                user = u
            except Exception as e:
                print(f"Failed to create tenant user: {e}")
                db.session.rollback()
        
        if user:
            is_valid = user.check_password("password123")
            print(f"Tenant User exists. Password Valid: {is_valid}")
            
        # 3. Affiliate Login
        print("\n--- Verifying Affiliate Login ---")
        aff_email = "affiliate@x-ear.com"
        
        # Check if exists
        aff = AffiliateUser.query.filter_by(email=aff_email).first()
        if not aff:
            print("Creating test affiliate...")
            try:
                AffiliateService.create_affiliate(
                    db=db.session,
                    email=aff_email,
                    password="password123",
                    iban="TR260006100000000000000000"
                )
                print("Test Affiliate Created.")
            except Exception as e:
                print(f"Failed to create affiliate: {e}")
                db.session.rollback()

        # Validate
        user = AffiliateService.authenticate(db.session, aff_email, "password123")
        if user:
            print(f"Affiliate User authenticated successfully: {user.email}")
        else:
            print("Affiliate authentication FAILED.")

if __name__ == "__main__":
    verify_logins()
