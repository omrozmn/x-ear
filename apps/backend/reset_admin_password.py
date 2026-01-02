from app import app, db
from models.admin_user import AdminUser
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def reset_password():
    with app.app_context():
        email = "admin@x-ear.com"
        password = "admin123"
        
        admin = AdminUser.query.filter_by(email=email).first()
        if admin:
            logger.info(f"Found admin user: {email}")
            admin.set_password(password)
            db.session.commit()
            logger.info(f"Password reset to '{password}' successfully.")
        else:
            logger.error("Admin user not found!")

if __name__ == "__main__":
    reset_password()
