
import sqlite3

db_path = 'instance/xear_crm.db'

def get_tenant():
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM tenants LIMIT 1")
        row = cursor.fetchone()
        if row:
            print(f"Tenant ID: {row[0]}")
        else:
            print("No tenants found.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    get_tenant()
