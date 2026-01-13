import sqlite3
import os

db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'instance', 'xear_crm.db'))
print(f"Checking DB at {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

tables = ['inventory', 'payment_records', 'suppliers', 'appointments']

for table in tables:
    print(f"\nTable: {table}")
    try:
        cursor.execute(f"PRAGMA table_info({table})")
        columns = cursor.fetchall()
        for col in columns:
            print(f"  {col[1]} ({col[2]})")
    except Exception as e:
        print(f"  Error: {e}")

conn.close()
