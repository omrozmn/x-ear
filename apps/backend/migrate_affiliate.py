from app import app, db
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    with app.app_context():
        try:
            logger.info("Attempting to add affiliate_code column to users table...")
            # Check if column exists first (naive check or just try/except)
            
            # Try PostgreSQL syntax first (IF NOT EXISTS is nice but not all versions)
            # Actually, standard SQL ADD COLUMN often fails if exists.
            
            # We will just try to execute.
            with db.engine.connect() as conn:
                try:
                    # SQLite/Postgres standard
                    conn.execute(text("ALTER TABLE users ADD COLUMN affiliate_code VARCHAR(50)"))
                    conn.commit()
                    logger.info("Successfully added affiliate_code column.")
                except Exception as e:
                    logger.warning(f"Could not add column (might already exist): {e}")
                    
        except Exception as e:
            logger.error(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
