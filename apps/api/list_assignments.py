
import sqlite3

db_path = 'instance/xear_crm.db'

def list_all_assignments():
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT id, patient_id, created_at, delivery_status, is_loaner FROM device_assignments LIMIT 10")
        rows = cursor.fetchall()
        
        print("--- All Assignments (Limit 10) ---")
        for row in rows:
            print(f"ID: {row['id']}, Patient: {row['patient_id']}, Created: {row['created_at']}, Delivery: {row['delivery_status']}, Loaner: {row['is_loaner']}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    list_all_assignments()
