from app import app, db
from models.user import User
from models.admin_user import AdminUser
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_admin_user():
    with app.app_context():
        email = "admin@x-ear.com"
        password = "admin123"
        
        # Check if admin exists in AdminUser table
        admin = AdminUser.query.filter_by(email=email).first()
        if admin:
            logger.info(f"AdminUser already exists: {email}")
            logger.info(f"Role: {admin.role}, Active: {admin.is_active}")
            # Ensure password is correct
            admin.set_password(password)
            admin.is_active = True
            admin.role = 'super_admin'
            db.session.commit()
            logger.info("Password and role updated")
            return
        
        # Create new AdminUser
        admin = AdminUser(
            email=email,
            first_name='Super',
            last_name='Admin',
            role='super_admin',
            is_active=True
        )
        admin.set_password(password)
        db.session.add(admin)
        db.session.commit()
        
        logger.info(f"AdminUser created: {email}, role: super_admin")

if __name__ == "__main__":
    create_admin_user()
