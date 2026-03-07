#!/usr/bin/env python3
"""
Add phone and contact fields to tenants table
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import engine

def add_tenant_contact_fields():
    """Add contact fields to tenants table"""
    
    sql = """
    ALTER TABLE tenants 
    ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS city VARCHAR(100),
    ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS tax_office VARCHAR(100);
    """
    
    try:
        with engine.connect() as conn:
            conn.execute(text(sql))
            conn.commit()
            print("✅ Successfully added contact fields to tenants table")
            print("   - phone (VARCHAR 50)")
            print("   - email (VARCHAR 255)")
            print("   - address (TEXT)")
            print("   - city (VARCHAR 100)")
            print("   - tax_number (VARCHAR 50)")
            print("   - tax_office (VARCHAR 100)")
    except Exception as e:
        print(f"❌ Error adding fields: {e}")
        sys.exit(1)

if __name__ == "__main__":
    add_tenant_contact_fields()
