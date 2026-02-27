from __future__ import annotations
from typing_extensions import ParamSpec as ParamSpec_Typing, Concatenate
from typing import TypeVar,  Optional, Any, Union, List, Dict
import sqlite3
import os

db_path = "/Users/ozmen/Desktop/x-ear web app/x-ear/apps/backend/xear_crm.db"
if not os.path.exists(db_path):
    print(f"Error: Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get users
cursor.execute("SELECT id, username, email, role, tenant_id FROM users LIMIT 10")
users = cursor.fetchall()
print("--- USERS ---")
for u in users:
    print(u)

# Get tenants
cursor.execute("SELECT id, name, slug FROM tenants LIMIT 5")
tenants = cursor.fetchall()
print("\n--- TENANTS ---")
for t in tenants:
    print(t)

# Get admin users
try:
    cursor.execute("SELECT id, email, role FROM admin_users LIMIT 5")
    admins = cursor.fetchall()
    print("\n--- ADMIN USERS ---")
    for a in admins:
        print(a)
except sqlite3.OperationalError as e:
    print(f"\nAdmin table error: {e}")

conn.close()
