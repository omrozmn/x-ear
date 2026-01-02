
from app import app
from models.user import User
from models.admin_user import AdminUser
from models.affiliate_user import AffiliateUser
from models.tenant import Tenant
from models.base import db
from services.affiliate_service import AffiliateService
from utils.tenant_security import _skip_filter
import uuid

def unify_access():
    with app.app_context():
        _skip_filter.set(True)
        email = "admin@x-ear.com"
        password = "password123" # Use a known password or reset it

        print(f"Unifying access for {email}...")

        # 1. Ensure AdminUser (Admin Panel)
        admin = AdminUser.query.filter_by(email=email).first()
        if not admin:
            print("Creating AdminUser...")
            admin = AdminUser(
                id=str(uuid.uuid4()),
                email=email,
                first_name="Super",
                last_name="Admin",
                role="super_admin",
                is_active=True
            )
            admin.set_password(password)
            db.session.add(admin)
        else:
            print("AdminUser exists. Updating password...")
            admin.set_password(password)
        
        # 2. Ensure Tenant and User (CRM Panel)
        # Check if user already exists
        user = User.query.filter_by(email=email).first()
        if not user:
            print("Creating System Tenant and User...")
            # Create special System Tenant if not exists
            tenant = Tenant.query.filter_by(slug="system-admin").first()
            if not tenant:
                tenant = Tenant(
                    name="System Admin",
                    slug="system-admin",
                    owner_email=email,
                    billing_email=email,
                    status="active"
                )
                db.session.add(tenant)
                db.session.flush()
            
            user = User(
                email=email,
                username="superadmin",
                tenant_id=tenant.id,
                role="tenant_admin",
                is_active=True,
                is_phone_verified=True # Auto-verify to skip OTP
            )
            user.set_password(password)
            db.session.add(user)
        else:
             print("CRM User exists. Updating password/verification...")
             user.set_password(password)
             user.is_phone_verified = True # Ensure no OTP block
             if not user.is_active:
                 user.is_active = True
             db.session.add(user)

        # 3. Ensure AffiliateUser (Affiliate Panel)
        aff = AffiliateUser.query.filter_by(email=email).first()
        if not aff:
            print("Creating AffiliateUser...")
            # Create via model directly to avoid duplicate email check logic if any in service
            # But better use service or manual DB add
            try:
                # Manual add to control fields
                from passlib.hash import pbkdf2_sha256
                aff = AffiliateUser(
                    email=email,
                    password_hash=pbkdf2_sha256.hash(password),
                    iban="TR260006100000000000000000",
                    code="SUPERADM", # Special code
                    is_active=True
                )
                db.session.add(aff)
            except Exception as e:
                print(f"Error preparing affiliate: {e}")
        else:
             print("AffiliateUser exists. Updating password...")
             from passlib.hash import pbkdf2_sha256
             aff.password_hash = pbkdf2_sha256.hash(password)
             db.session.add(aff)

        try:
            db.session.commit()
            print("✅ Successfully unified access!")
            print(f"Login: {email}")
            print(f"Password: {password}")
        except Exception as e:
            print(f"❌ Database commit failed: {e}")
            db.session.rollback()

if __name__ == "__main__":
    unify_access()
