#!/usr/bin/env python3
"""
Reset the SQLite DB by deleting all rows from user tables and seed a single admin tenant and admin user.
Run from repo root: python3 x-ear/apps/backend/scripts/reset_and_seed_admin.py
"""
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from werkzeug.security import generate_password_hash

DB_PATH = Path(__file__).parent.parent / 'instance' / 'xear_crm.db'
if not DB_PATH.exists():
    print('DB not found at', DB_PATH)
    raise SystemExit(1)

conn = sqlite3.connect(str(DB_PATH))
cur = conn.cursor()

# Disable foreign keys while truncating
cur.execute('PRAGMA foreign_keys = OFF')
conn.commit()

# Get list of user tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
rows = [r[0] for r in cur.fetchall()]
# Exclude sqlite_sequence and alembic_version if present
exclude = set(['sqlite_sequence', 'alembic_version'])
tables = [t for t in rows if t not in exclude]

print('Tables to truncate:', tables)
for t in tables:
    try:
        cur.execute(f'DELETE FROM "{t}"')
    except Exception as e:
        print('Failed to delete from', t, e)

# Reset sqlite_sequence entries
try:
    cur.execute("DELETE FROM sqlite_sequence")
except Exception:
    pass

conn.commit()
cur.execute('PRAGMA foreign_keys = ON')
conn.commit()

# Seed admin tenant
tenant_id = str(uuid.uuid4())
now = datetime.utcnow().isoformat()
tenant = {
    'id': tenant_id,
    'name': 'Admin Tenant',
    'slug': 'admin',
    'description': 'Seeded admin tenant',
    'owner_email': 'admin@example.com',
    'billing_email': 'admin@example.com',
    'status': 'active',
    'max_users': 10,
    'current_users': 1,
    'created_at': now,
    'updated_at': now
}

# Insert tenant - only include columns that exist
tenant_cols = [k for k in tenant.keys()]
tenant_vals = [tenant[k] for k in tenant_cols]
placeholders = ','.join('?' for _ in tenant_cols)
cur.execute(f"INSERT INTO tenants ({','.join(tenant_cols)}) VALUES ({placeholders})", tenant_vals)

# Seed admin user
user_id = 'usr_admin'
username = 'admin'
email = 'admin@example.com'
password = 'Password123!'
password_hash = generate_password_hash(password)
user = {
    'id': user_id,
    'username': username,
    'email': email,
    'phone': None,
    'tenant_id': tenant_id,
    'password_hash': password_hash,
    'first_name': 'Admin',
    'last_name': 'User',
    'role': 'admin',
    'is_active': 1,
    'created_at': now,
    'updated_at': now
}
user_cols = [k for k in user.keys()]
user_vals = [user[k] for k in user_cols]
placeholders = ','.join('?' for _ in user_cols)
cur.execute(f"INSERT INTO users ({','.join(user_cols)}) VALUES ({placeholders})", user_vals)

# Update tenant current_users
try:
    cur.execute('UPDATE tenants SET current_users = ? WHERE id = ?', (1, tenant_id))
except Exception:
    pass

conn.commit()
print('Seeded tenant id=', tenant_id)
print('Seeded admin user:', username, 'password:', password)
conn.close()
