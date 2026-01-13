import sqlite3
import os
import json

# Database path
DB_PATH = 'instance/xear_crm.db'

def check_cash():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # Count total records
        cursor.execute("SELECT COUNT(*) FROM payment_records")
        count = cursor.fetchone()[0]
        print(f"Total PaymentRecords: {count}")
        
        # Check table structure
        cursor.execute("PRAGMA table_info(payment_records)")
        cols = [col[1] for col in cursor.fetchall()]
        print(f"Columns: {cols}")
        
        # Fetch last 5 records
        cursor.execute("SELECT * FROM payment_records ORDER BY payment_date DESC LIMIT 5")
        rows = cursor.fetchall()
        
        if rows:
            print("\nLast 5 Records:")
            for row in rows:
                # Convert row to dict for printing
                d = dict(row)
                print(f"- ID: {d.get('id')} | Date: {d.get('payment_date')} | Type: {d.get('payment_type')} | Amount: {d.get('amount')} | Tenant: {d.get('tenant_id')}")
        else:
            print("\nNo records found.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_cash()
