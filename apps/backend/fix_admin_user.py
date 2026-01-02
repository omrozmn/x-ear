from app import app, db
from models.user import User
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_admin():
    with app.app_context():
        email = "admin@x-ear.com"
        
        user = User.query.filter_by(email=email).first()
        if user:
            logger.info(f"Found user: {email}, current role: {user.role}, is_super_admin: {user.is_super_admin}")
            
            # Set as super admin
            user.is_super_admin = True
            user.role = 'admin'
            db.session.commit()
            
            logger.info(f"Updated: is_super_admin=True, role=admin")
        else:
            logger.error("User not found!")

if __name__ == "__main__":
    fix_admin()
