import sqlite3
import os

DB_PATH = 'instance/xear_crm.db'

def cleanup_tmp_tables():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Find all tables starting with _alembic_tmp_
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '_alembic_tmp_%'")
    tables = cursor.fetchall()
    
    if not tables:
        print("No temporary tables found.")
    else:
        for table in tables:
            table_name = table[0]
            print(f"Dropping temporary table: {table_name}")
            cursor.execute(f"DROP TABLE IF EXISTS {table_name}")
            
    conn.commit()
    conn.close()
    print("Cleanup complete.")

if __name__ == "__main__":
    cleanup_tmp_tables()
