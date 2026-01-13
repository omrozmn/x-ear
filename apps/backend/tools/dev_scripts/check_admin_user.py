"""Check admin user existence - Pure SQLAlchemy (No Flask)."""

import os
import sys
import logging

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from database import SessionLocal
from models.user import User
from models.admin_user import AdminUser


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def check_admin(email: str = "admin@x-ear.com"):
    logger.info("Checking for user: %s", email)
    db = SessionLocal()
    try:
        admin = db.query(AdminUser).filter_by(email=email).first()
        if admin:
            logger.info("FOUND in AdminUser: %s (ID: %s)", admin.email, admin.id)
            return

        user = db.query(User).filter_by(email=email).first()
        if user:
            logger.info("FOUND in User: %s (Role: %s)", user.email, getattr(user, "role", None))
            return

        logger.warning("User NOT FOUND in either table.")
    finally:
        db.close()


if __name__ == "__main__":
    check_admin()
