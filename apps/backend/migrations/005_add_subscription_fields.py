"""
Database Migration: Add Subscription Fields to Tenant
Adds subscription tracking fields to the tenants table.
"""

import sqlite3
import os
from datetime import datetime

def run_migration():
    """Execute the migration to add subscription fields"""
    
    # Database path
    db_path = os.path.join(os.path.dirname(__file__), '..', 'instance', 'xear_crm.db')
    
    print(f"📊 Running migration: Add Subscription Fields")
    print(f"Database: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if columns exist in tenants table
        cursor.execute("PRAGMA table_info(tenants)")
        columns = [col[1] for col in cursor.fetchall()]
        
        # Add subscription_start_date
        if 'subscription_start_date' not in columns:
            print("Adding subscription_start_date to tenants...")
            cursor.execute("ALTER TABLE tenants ADD COLUMN subscription_start_date DATETIME")
        
        # Add subscription_end_date
        if 'subscription_end_date' not in columns:
            print("Adding subscription_end_date to tenants...")
            cursor.execute("ALTER TABLE tenants ADD COLUMN subscription_end_date DATETIME")
            
        # Add feature_usage
        if 'feature_usage' not in columns:
            print("Adding feature_usage to tenants...")
            cursor.execute("ALTER TABLE tenants ADD COLUMN feature_usage JSON")
            
        # Add current_plan_id if not exists (we have current_plan which might be slug)
        if 'current_plan_id' not in columns:
            print("Adding current_plan_id to tenants...")
            cursor.execute("ALTER TABLE tenants ADD COLUMN current_plan_id VARCHAR(36)")
            # We can't easily add FK constraint in SQLite ALTER TABLE, so we skip it for now
            # or we would need to recreate the table. For now, we'll manage it in app logic.

        conn.commit()
        conn.close()
        print("\n✨ Migration completed successfully!")
        
    except sqlite3.Error as e:
        print(f"❌ Migration failed: {e}")
        raise
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        raise


if __name__ == '__main__':
    run_migration()
