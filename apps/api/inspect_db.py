
import sqlite3
import sys

db_path = 'instance/xear_crm.db'

def inspect_assignment(assignment_id):
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Query assignment
        cursor.execute("SELECT * FROM device_assignments WHERE id = ?", (assignment_id,))
        row = cursor.fetchone()
        
        if row:
            print("--- Assignment Details ---")
            for key in row.keys():
                print(f"{key}: {row[key]}")
        else:
            print(f"No assignment found with ID: {assignment_id}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        inspect_assignment(sys.argv[1])
    else:
        print("Usage: python inspect_db.py <assignment_id>")
