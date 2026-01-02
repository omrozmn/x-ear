from app import app, db
from models.user import User
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def remove_duplicate_user():
    with app.app_context():
        email = "admin@x-ear.com"
        
        # Find and delete the User record (tenant user)
        user = User.query.filter_by(email=email).first()
        if user:
            logger.info(f"Found User record: {user.id}, deleting...")
            db.session.delete(user)
            db.session.commit()
            logger.info("Deleted User record. Only AdminUser remains now.")
        else:
            logger.info("No User record found with this email")

if __name__ == "__main__":
    remove_duplicate_user()
