#!/usr/bin/env python3
"""Add serial number columns to device_assignments table"""

from models.base import db
from app import app
from sqlalchemy import text

def add_serial_columns():
    with app.app_context():
        try:
            # Check if columns already exist
            result = db.session.execute(text("PRAGMA table_info(device_assignments)"))
            columns = [row[1] for row in result]
            
            if 'serial_number' not in columns:
                db.session.execute(text("ALTER TABLE device_assignments ADD COLUMN serial_number VARCHAR(100)"))
                print("✅ Added serial_number column")
            else:
                print("ℹ️  serial_number column already exists")
            
            if 'serial_number_left' not in columns:
                db.session.execute(text("ALTER TABLE device_assignments ADD COLUMN serial_number_left VARCHAR(100)"))
                print("✅ Added serial_number_left column")
            else:
                print("ℹ️  serial_number_left column already exists")
            
            if 'serial_number_right' not in columns:
                db.session.execute(text("ALTER TABLE device_assignments ADD COLUMN serial_number_right VARCHAR(100)"))
                print("✅ Added serial_number_right column")
            else:
                print("ℹ️  serial_number_right column already exists")
            
            db.session.commit()
            print("\n✅ Migration completed successfully!")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error: {e}")
            raise

if __name__ == '__main__':
    add_serial_columns()
