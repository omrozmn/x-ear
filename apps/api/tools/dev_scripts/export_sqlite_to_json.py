
import sys
import os
import json
import logging
from datetime import datetime

# Path setup for backend imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from database import engine, SessionLocal
from sqlalchemy import inspect
from models.base import Base

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OUTPUT_FILE = "data_export.json"

def datetime_serializer(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

def export_data():
    logger.info("Starting SQLite export...")
    
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    
    export_data = {}
    
    with engine.connect() as conn:
        for table in table_names:
            if table == 'alembic_version':
                continue
                
            logger.info(f"Exporting table: {table}")
            try:
                # Use SQL text for broader compatibility if models aren't all imported
                # But safer to just select *
                from sqlalchemy import text
                result = conn.execute(text(f"SELECT * FROM {table}"))
                rows = [dict(row._mapping) for row in result]
                export_data[table] = rows
                logger.info(f"  -> {len(rows)} rows")
            except Exception as e:
                logger.error(f"Failed to export {table}: {e}")

    logger.info(f"Writing to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(export_data, f, default=datetime_serializer, indent=2)
    
    logger.info("Export complete.")

if __name__ == "__main__":
    export_data()
