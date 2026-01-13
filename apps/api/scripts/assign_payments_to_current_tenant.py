import sqlite3
import os

DB_PATH = 'instance/xear_crm.db'
TARGET_TENANT = '138283aa-249a-44e7-9600-257997ecd789'

def fix_tenant():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Update records
        cursor.execute("UPDATE payment_records SET tenant_id = ?", (TARGET_TENANT,))
        print(f"Updated {cursor.rowcount} records to tenant {TARGET_TENANT}")
        conn.commit()
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_tenant()
