"""
Database Migration: Add Branch Support
Creates the branches table, user_branches association table, and adds branch_id to relevant tables.
"""

import sqlite3
import os
from datetime import datetime

def run_migration():
    """Execute the migration to add branch support"""
    
    # Database path
    db_path = os.path.join(os.path.dirname(__file__), '..', 'instance', 'xear_crm.db')
    
    print(f"📊 Running migration: Add Branch Support")
    print(f"Database: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 1. Create branches table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS branches (
                id VARCHAR(50) PRIMARY KEY,
                tenant_id VARCHAR(50) NOT NULL,
                name VARCHAR(100) NOT NULL,
                address TEXT,
                phone VARCHAR(20),
                email VARCHAR(100),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id)
            )
        """)
        print("✅ Branches table created/verified")
        
        # 2. Create user_branches table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_branches (
                user_id VARCHAR(50) NOT NULL,
                branch_id VARCHAR(50) NOT NULL,
                PRIMARY KEY (user_id, branch_id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (branch_id) REFERENCES branches(id)
            )
        """)
        print("✅ User_branches table created/verified")
        
        # 3. Add branch_id to existing tables
        tables_to_update = [
            'inventory', 'invoices', 'proformas', 'payment_records', 'sales', 
            'patients', 'purchase_invoices', 'purchase_invoice_items', 
            'suggested_suppliers', 'device_assignments', 'payment_plans'
        ]
        
        for table in tables_to_update:
            try:
                # Check if column exists
                cursor.execute(f"PRAGMA table_info({table})")
                columns = [col[1] for col in cursor.fetchall()]
                
                if 'branch_id' not in columns:
                    print(f"Adding branch_id to {table}...")
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN branch_id VARCHAR(50)")
                    cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{table}_branch_id ON {table}(branch_id)")
                    print(f"✅ Added branch_id to {table}")
                else:
                    print(f"ℹ️  branch_id already exists in {table}")
                    
            except sqlite3.OperationalError as e:
                print(f"⚠️  Could not update {table}: {e} (Table might not exist)")

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
