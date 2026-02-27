#!/usr/bin/env python3
"""Fix notification_templates table - add tenant_id column"""
import sqlite3
import sys

db_path = "apps/api/instance/xear_crm.db"

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if tenant_id already exists
    cursor.execute("PRAGMA table_info(notification_templates)")
    columns = [row[1] for row in cursor.fetchall()]
    
    if 'tenant_id' in columns:
        print("✓ tenant_id column already exists")
    else:
        print("Adding tenant_id column...")
        cursor.execute("ALTER TABLE notification_templates ADD COLUMN tenant_id VARCHAR(50)")
        conn.commit()
        print("✓ tenant_id column added")
    
    # Check if index exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='ix_notification_templates_tenant_id'")
    if cursor.fetchone():
        print("✓ Index already exists")
    else:
        print("Creating index...")
        cursor.execute("CREATE INDEX ix_notification_templates_tenant_id ON notification_templates(tenant_id)")
        conn.commit()
        print("✓ Index created")
    
    conn.close()
    print("\n✅ Database migration completed successfully!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
