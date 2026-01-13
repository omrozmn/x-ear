
import sys
import os
import json
import logging
from datetime import datetime

# Path setup for backend imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

# Note: This script assumes a target PostgreSQL database is configured via DATABASE_URL
# For now, it will use the current database config but is designed for Postgres structure.

from database import engine, SessionLocal, Base
from sqlalchemy import text
import pprint

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

INPUT_FILE = "data_export.json"

def import_data():
    if not os.path.exists(INPUT_FILE):
        logger.error(f"Input file {INPUT_FILE} not found. Run export first.")
        return

    logger.info(f"Reading from {INPUT_FILE}...")
    with open(INPUT_FILE, 'r') as f:
        data = json.load(f)

    # Order of tables matters for Foreign Keys!
    # Ideally we disable constraints, load, then specific enable.
    # Postgres: SET session_replication_role = 'replica'; ... = 'origin';
    
    logger.info("Starting Import...")
    
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # Disable FK checks (Postgres specific syntax usually, here generic/sqlite fallback)
            # For SQLite: PRAGMA foreign_keys = OFF;
            # For Postgres: SET session_replication_role = 'replica';
            
            db_url = str(engine.url)
            if 'sqlite' in db_url:
                conn.execute(text("PRAGMA foreign_keys = OFF"))
            elif 'postgresql' in db_url:
                conn.execute(text("SET session_replication_role = 'replica'"))

            for table_name, rows in data.items():
                logger.info(f"Importing table: {table_name} ({len(rows)} rows)")
                if not rows:
                    continue
                
                # Naive insert via SQL construction to avoid model dependency issues
                # In production, we'd map to models or use bulk_insert_mappings
                
                # Get column names from first row (assuming uniform rows)
                columns = rows[0].keys()
                cols_str = ', '.join(columns)
                vals_str = ', '.join([f":{c}" for c in columns])
                
                stmt = text(f"INSERT INTO {table_name} ({cols_str}) VALUES ({vals_str})")
                
                # Execute batch?
                try:
                    conn.execute(stmt, rows)
                except Exception as e:
                     logger.error(f"Error inserting into {table_name}: {e}")
                     # Try line by line for debugging if batch fails?
                     pass

            if 'sqlite' in db_url:
                conn.execute(text("PRAGMA foreign_keys = ON"))
            elif 'postgresql' in db_url:
                conn.execute(text("SET session_replication_role = 'origin'"))
            
            # Validation: Row Counts
            logger.info("Validating row counts...")
            for table_name, rows in data.items():
                if not rows: continue
                result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                count = result.scalar()
                expected = len(rows)
                if count != expected:
                    raise ValueError(f"Validation Failed: {table_name} has {count} rows, expected {expected}")
                logger.info(f"✅ {table_name}: {count} rows verified.")

            trans.commit()
            logger.info("Import completed successfully.")
            
        except Exception as e:
            trans.rollback()
            logger.error(f"Import failed: {e}")
            raise

if __name__ == "__main__":
    import_data()
