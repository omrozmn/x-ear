"""
Migration: Add features column to inventory table
Created: 2025-10-02
Purpose: Add JSON array field for product features

Usage:
    cd backend
    python3 migrations/002_add_features_column.py
"""

if __name__ == '__main__':
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
    
    from models.base import db
    from app import app
    from sqlalchemy import text
    
    with app.app_context():
        try:
            with db.engine.connect() as conn:
                conn.execute(text("""
                    ALTER TABLE inventory 
                    ADD COLUMN IF NOT EXISTS features TEXT;
                """))
                conn.commit()
            print("✅ Added features column to inventory table")
        except Exception as e:
            print(f"❌ Migration error: {e}")
            sys.exit(1)
