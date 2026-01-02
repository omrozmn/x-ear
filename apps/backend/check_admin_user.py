from app import app, db
from models.user import User
from models.admin_user import AdminUser
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_admin():
    with app.app_context():
        email = "admin@x-ear.com"
        logger.info(f"Checking for user: {email}")
        
        # Check AdminUser table first
        admin = AdminUser.query.filter_by(email=email).first()
        if admin:
            logger.info(f"FOUND in AdminUser: {admin.email} (ID: {admin.id})")
            return

        # Check User table
        user = User.query.filter_by(email=email).first()
        if user:
            logger.info(f"FOUND in User: {user.email} (Role: {user.role})")
        else:
            logger.warning("User NOT FOUND in either table.")
            # Optional: Create it? User just asked to "check".
            
if __name__ == "__main__":
    check_admin()
