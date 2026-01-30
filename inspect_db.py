import sqlite3
import os

paths = [
    '/Users/omerozmen/Desktop/x-ear web app/x-ear/apps/api/instance/xear_crm.db',
    '/Users/omerozmen/Desktop/x-ear web app/x-ear/apps/backend/instance/xear_crm.db',
    '/Users/omerozmen/Desktop/x-ear web app/x-ear/apps/api/xear_crm.db'
]

for db_path in paths:
    if os.path.exists(db_path):
        print(f"--- Checking {db_path} ---")
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = [t[0] for t in cursor.fetchall()]
            print(f"Tables: {tables}")
            
            if 'users' in tables:
                cursor.execute("SELECT id, email, tenant_id FROM users WHERE email = 'admin@x-ear.com';")
                user = cursor.fetchone()
                if user:
                    print(f"User Found: ID={user[0]}, Email={user[1]}, TenantID={user[2]}")
                else:
                    cursor.execute("SELECT id, email, tenant_id FROM users LIMIT 5;")
                    print(f"Other Users (samples): {cursor.fetchall()}")
            
            if 'tenants' in tables:
                cursor.execute("SELECT id, name FROM tenants LIMIT 5;")
                print(f"Tenants (samples): {cursor.fetchall()}")
                
            conn.close()
        except Exception as e:
            print(f"Error checking {db_path}: {e}")
    else:
        print(f"NOT FOUND: {db_path}")
