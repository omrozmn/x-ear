
from app import app, db
from models.user import User
from models.tenant import Tenant
import uuid

def create_tenant_user():
    with app.app_context():
        # Get Tenant
        tenant = Tenant.query.filter_by(slug="tenant-1").first()
        if not tenant:
            print("Tenant not found! Creating one...")
            tenant = Tenant(
                name="Tenant 1",
                slug="tenant-1",
                owner_email="admin@x-ear.com",
                billing_email="billing@x-ear.com"
            )
            db.session.add(tenant)
            db.session.commit()
            print(f"Created tenant: {tenant.id}")

        # Check if user exists
        user = User.query.filter_by(email="crm_user@x-ear.com").first()
        if user:
            print(f"User {user.email} already exists. Resetting password and active status...")
            user.set_password("password123")
            user.is_active = True
            user.tenant_id = tenant.id
            db.session.commit()
            print("User updated.")
        else:
            print("Creating crm_user@x-ear.com...")
            user = User(
                email="crm_user@x-ear.com",
                username="crm_user",
                role="admin",  # Tenant Admin
                tenant_id=tenant.id,
                is_active=True
            )
            user.set_password("password123")
            db.session.add(user)
            db.session.commit()
            print(f"Created user {user.email} in tenant {tenant.id}")

if __name__ == "__main__":
    create_tenant_user()
