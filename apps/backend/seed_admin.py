
from app import app
from models.base import db
from models.admin_user import AdminUser
import uuid

def seed_admin():
    with app.app_context():
        print("Seeding admin user...")
        email = "admin@x-ear.com"
        
        # Check if already exists
        existing = AdminUser.query.filter_by(email=email).first()
        if existing:
            print(f"Admin user {email} already exists.")
            return

        # Create new admin
        admin = AdminUser(
            id=str(uuid.uuid4()),
            email=email,
            first_name="Admin",
            last_name="User",
            role="super_admin",
            is_active=True
        )
        admin.set_password("password123")
        
        db.session.add(admin)
        db.session.commit()
        print(f"✅ Successfully created admin user: {email} / password123")

if __name__ == "__main__":
    seed_admin()
