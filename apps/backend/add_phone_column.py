
import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'instance', 'xear_crm.db')

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}, assuming new DB will be created correctly.")
    exit(0)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE affiliate_user ADD COLUMN phone_number VARCHAR(20)")
    conn.commit()
    print("Successfully added phone_number column.")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("Column phone_number already exists.")
    else:
        print(f"Error adding column: {e}")
finally:
    conn.close()
