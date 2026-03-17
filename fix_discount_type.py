#!/usr/bin/env python3
"""
Fix discount_type and discount_value in old device assignments.
Run from x-ear directory: python fix_discount_type.py
"""

import sqlite3
import sys

def fix_discount_types():
    db_path = "apps/api/instance/xear_crm.db"
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Update assignments with discount_amount but no discount_type
        cursor.execute("""
            UPDATE device_assignments
            SET 
                discount_type = 'amount',
                discount_value = discount_amount
            WHERE 
                discount_amount IS NOT NULL 
                AND discount_amount > 0 
                AND (discount_type IS NULL OR discount_type = '')
        """)
        
        updated_count = cursor.rowcount
        conn.commit()
        
        print(f"✅ Updated {updated_count} device assignments")
        
        # Verify
        cursor.execute("""
            SELECT 
                id,
                sale_id,
                discount_type,
                discount_value,
                discount_amount
            FROM device_assignments
            WHERE discount_amount > 0
            ORDER BY created_at DESC
            LIMIT 5
        """)
        
        print("\n📋 Sample updated records:")
        for row in cursor.fetchall():
            print(f"  ID: {row[0]}, Sale: {row[1]}, Type: {row[2]}, Value: {row[3]}, Amount: {row[4]}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    fix_discount_types()
