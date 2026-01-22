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
    'product_code': 'xear_hearing',
    'created_at': now,
    'updated_at': now
}

# Insert tenant - only include columns that exist
tenant_cols = [k for k in tenant.keys()]
tenant_vals = [tenant[k] for k in tenant_cols]
placeholders = ','.join('?' for _ in tenant_cols)
cur.execute(f"INSERT INTO tenants ({','.join(tenant_cols)}) VALUES ({placeholders})", tenant_vals)

# Seed admin user
# Seed admin user structure matching AdminUser model (admin_users table)
user_id = 'usr_admin_' + str(uuid.uuid4())
email = 'admin@example.com'
password = 'Password123!'
password_hash = generate_password_hash(password, method='pbkdf2:sha256')

admin_user = {
    'id': user_id,
    'email': email,
    'password_hash': password_hash,
    'first_name': 'Admin',
    'last_name': 'User',
    'role': 'super_admin',
    'is_active': 1,
    'mfa_enabled': 0,
    'created_at': now,
    'updated_at': now
}

admin_cols = [k for k in admin_user.keys()]
admin_vals = [admin_user[k] for k in admin_cols]
placeholders = ','.join('?' for _ in admin_cols)
try:
    cur.execute(f"INSERT INTO admin_users ({','.join(admin_cols)}) VALUES ({placeholders})", admin_vals)
    print(f"Seeded admin user into admin_users: {email}")
except sqlite3.OperationalError as e:
    print(f"Error inserting into admin_users: {e}. Check if table exists.")


# Seed E2E test tenant and user (for Playwright tests)
test_tenant_id = 'test-tenant-001'
test_tenant = {
    'id': test_tenant_id,
    'name': 'Test Tenant',
    'slug': 'test-tenant',
    'description': 'E2E Test tenant',
    'owner_email': 'tenant@x-ear.com',
    'billing_email': 'tenant@x-ear.com',
    'status': 'active',
    'max_users': 100,
    'current_users': 0,
    'product_code': 'xear_hearing',
    'created_at': now,
    'updated_at': now
}
test_tenant_cols = [k for k in test_tenant.keys()]
test_tenant_vals = [test_tenant[k] for k in test_tenant_cols]
placeholders = ','.join('?' for _ in test_tenant_cols)
cur.execute(f"INSERT INTO tenants ({','.join(test_tenant_cols)}) VALUES ({placeholders})", test_tenant_vals)

# E2E test user - used by Playwright tests
test_user_id = 'usr_e2e_tenant'
test_user_email = 'tenant@x-ear.com'
test_user_phone = '+905551234567'
test_password = 'password123'
test_password_hash = generate_password_hash(test_password)
test_user = {
    'id': test_user_id,
    'username': 'tenant_admin',
    'email': test_user_email,
    'phone': test_user_phone,
    'tenant_id': test_tenant_id,
    'password_hash': test_password_hash,
    'first_name': 'Tenant',
    'last_name': 'Admin',
    'role': 'tenant_admin',
    'is_active': 1,
    'is_phone_verified': 1,  # Required field
    'permissions_version': 1,
    'created_at': now,
    'updated_at': now
}
test_user_cols = [k for k in test_user.keys()]
test_user_vals = [test_user[k] for k in test_user_cols]
placeholders = ','.join('?' for _ in test_user_cols)
cur.execute(f"INSERT INTO users ({','.join(test_user_cols)}) VALUES ({placeholders})", test_user_vals)

# Update tenant current_users
try:
    cur.execute('UPDATE tenants SET current_users = ? WHERE id = ?', (1, tenant_id))
except Exception:
    pass

conn.commit()
print('Seeded tenant id=', tenant_id)
print('Seeded admin user:', email, 'password:', password)
print('Seeded test tenant id=', test_tenant_id)
print('Seeded test user:', test_user_email, 'phone:', test_user_phone, 'password:', test_password)
conn.close()
