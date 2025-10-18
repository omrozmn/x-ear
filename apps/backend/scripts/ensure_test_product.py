#!/usr/bin/env python3
"""
Ensure a test inventory product exists in the development database.
This script is idempotent and safe to run multiple times.
"""
import os
import sqlite3
from datetime import datetime

THIS_DIR = os.path.dirname(__file__)
DB_PATH = os.path.abspath(os.path.join(THIS_DIR, '..', 'instance', 'xear_crm.db'))

PRODUCT_ID = 'test_item_001'
PRODUCT = {
    'id': PRODUCT_ID,
    'name': 'Test Item 001',
    'brand': 'TestBrand',
    'model': 'T-001',
    'category': 'test_category',
    'barcode': '0000000000001',
    'supplier': 'Test Supplier',
    'description': 'Test product for E2E sale tests',
    'available_inventory': 10,
    'total_inventory': 10,
    'used_inventory': 0,
    'on_trial': 0,
    'reorder_level': 1,
    'available_serials': None,
    'price': 100.0,
    'features': None,
    'direction': None,
    'ear': None,
    'warranty': 0,
    'created_at': datetime.utcnow().isoformat(),
    'updated_at': datetime.utcnow().isoformat()
}


def ensure_product():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}; cannot seed test product.")
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Ensure inventory table exists
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='inventory'")
    if not cur.fetchone():
        print('inventory table not found in DB; aborting')
        conn.close()
        return

    # Read existing columns to build queries dynamically and be robust
    cur.execute("PRAGMA table_info(inventory)")
    rows = cur.fetchall()
    cols = [r[1] for r in rows]

    # Helper to map product dict keys to DB columns present
    def present_fields(obj):
        return [k for k in obj.keys() if k in cols]

    cur.execute("SELECT id FROM inventory WHERE id = ?", (PRODUCT_ID,))
    exists = cur.fetchone()

    if exists:
        # Build update statement for columns present
        update_cols = [c for c in present_fields(PRODUCT) if c != 'id']
        if update_cols:
            set_clause = ', '.join([f"{c} = ?" for c in update_cols])
            values = [PRODUCT[c] for c in update_cols]
            values.append(PRODUCT_ID)
            stmt = f"UPDATE inventory SET {set_clause} WHERE id = ?"
            cur.execute(stmt, values)
            print(f"Updated product {PRODUCT_ID}")
        else:
            print(f"No matching columns to update for {PRODUCT_ID}")
    else:
        insert_cols = present_fields(PRODUCT)
        if not insert_cols:
            print('No matching inventory columns found to insert product; aborting')
            conn.close()
            return
        placeholders = ','.join(['?'] * len(insert_cols))
        stmt = f"INSERT INTO inventory ({', '.join(insert_cols)}) VALUES ({placeholders})"
        values = [PRODUCT[c] for c in insert_cols]
        cur.execute(stmt, values)
        print(f"Inserted product {PRODUCT_ID}")

    conn.commit()
    conn.close()


if __name__ == '__main__':
    ensure_product()
