"""
Database Migration: Add Inventory Table
Creates the inventory table for product/stock management
"""

import sqlite3
import os
from datetime import datetime

def run_migration():
    """Execute the migration to add inventory table"""
    
    # Database path
    db_path = os.path.join(os.path.dirname(__file__), '..', 'instance', 'xear_crm.db')
    
    print(f"📊 Running migration: Add Inventory Table")
    print(f"Database: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if inventory table already exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='inventory'
        """)
        
        if cursor.fetchone():
            print("⚠️  Inventory table already exists, skipping creation")
            return
        
        # Create inventory table
        cursor.execute("""
            CREATE TABLE inventory (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                brand VARCHAR(100) NOT NULL,
                model VARCHAR(100),
                category VARCHAR(50) NOT NULL,
                barcode VARCHAR(100) UNIQUE,
                supplier VARCHAR(200),
                description TEXT,
                available_inventory INTEGER DEFAULT 0 NOT NULL,
                total_inventory INTEGER DEFAULT 0 NOT NULL,
                used_inventory INTEGER DEFAULT 0 NOT NULL,
                on_trial INTEGER DEFAULT 0 NOT NULL,
                reorder_level INTEGER DEFAULT 5 NOT NULL,
                available_serials TEXT,
                price REAL DEFAULT 0.0 NOT NULL,
                direction VARCHAR(10),
                ear VARCHAR(10),
                warranty INTEGER DEFAULT 0,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL
            )
        """)
        
        # Create indexes for better query performance
        cursor.execute("CREATE INDEX idx_inventory_category ON inventory(category)")
        cursor.execute("CREATE INDEX idx_inventory_brand ON inventory(brand)")
        cursor.execute("CREATE INDEX idx_inventory_barcode ON inventory(barcode)")
        cursor.execute("CREATE INDEX idx_inventory_available ON inventory(available_inventory)")
        
        conn.commit()
        print("✅ Inventory table created successfully")
        print("✅ Indexes created successfully")
        
        # Show table structure
        cursor.execute("PRAGMA table_info(inventory)")
        columns = cursor.fetchall()
        print("\n📋 Table structure:")
        for col in columns:
            print(f"  • {col[1]} ({col[2]})")
        
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
