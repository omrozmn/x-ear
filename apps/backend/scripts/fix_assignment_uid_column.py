import sqlite3
import os

# Database path (adjust based on app.py config)
DB_PATH = 'instance/xear_crm.db'

def fix_db():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(device_assignments)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'assignment_uid' not in columns:
            print("Adding assignment_uid column...")
            cursor.execute("ALTER TABLE device_assignments ADD COLUMN assignment_uid TEXT")
            conn.commit()
            print("Column added successfully.")
        else:
            print("Column assignment_uid already exists.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_db()
