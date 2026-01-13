"""Lightweight seeder for development only.
This script avoids importing the full Flask app or model metadata to prevent
SQLAlchemy MetaData duplication errors when run outside the app context.

It first ensures the users table schema contains modern columns by calling
ensure_user_schema.py, then inserts or updates admin and demo users.
"""
import os
import sqlite3
import hashlib
import uuid
from datetime import datetime
try:
    from werkzeug.security import generate_password_hash
except Exception:
    import hashlib
    def generate_password_hash(password: str) -> str:
        return hashlib.sha256(password.encode('utf-8')).hexdigest()

# Simple password hashing to match application's expectations (prefer Werkzeug).

def hash_password(password: str) -> str:
    # wrapper for compatibility; prefer Werkzeug's generate_password_hash
    return generate_password_hash(password)


THIS_DIR = os.path.dirname(__file__)
DB_PATH = os.path.abspath(os.path.join(THIS_DIR, '..', 'instance', 'xear_crm.db'))

ADMIN_USER = {
    'id': 'seed-admin-1',
    'username': 'seed-admin',
    'email': 'seed-admin@example.com',
    'phone': '+10000000000',
    'password': 'AdminPass123!',
    'first_name': 'System',
    'last_name': 'Administrator',
    'role': 'admin',
}

DEMO_USER = {
    'id': 'seed-demo-1',
    'username': 'seed-demo',
    'email': 'seed-demo@example.com',
    'phone': '+10000000001',
    'password': 'DemoPass123!',
    'first_name': 'Demo',
    'last_name': 'User',
    'role': 'user',
}

def ensure_schema():
    # Call the schema-ensure helper if present
    ensure_script = os.path.join(THIS_DIR, 'ensure_user_schema.py')
    if os.path.exists(ensure_script):
        print('Ensuring users table schema...')
        # Execute as a module to reuse logic without importing app models
        import runpy
        runpy.run_path(ensure_script, run_name='__main__')


def upsert_user(conn, user: dict, existing_columns: set):
    cur = conn.cursor()
    # Map only columns that exist in the table
    allowed_keys = existing_columns.intersection({'id', 'username', 'email', 'phone', 'password_hash', 'created_at', 'updated_at', 'first_name', 'last_name', 'role', 'is_active', 'last_login'})

    # Build insert columns and params
    now = datetime.utcnow().isoformat()

    data = {}
    # Prepare fields
    if 'id' in allowed_keys:
        data['id'] = user.get('id') or str(uuid.uuid4())
    if 'username' in allowed_keys:
        data['username'] = user['username']
    if 'email' in allowed_keys:
        data['email'] = user['email']
    if 'phone' in allowed_keys:
        data['phone'] = user.get('phone')
    if 'password_hash' in allowed_keys:
        data['password_hash'] = hash_password(user['password'])
    if 'created_at' in allowed_keys:
        data['created_at'] = now
    if 'updated_at' in allowed_keys:
        data['updated_at'] = now
    if 'first_name' in allowed_keys:
        data['first_name'] = user.get('first_name')
    if 'last_name' in allowed_keys:
        data['last_name'] = user.get('last_name')
    if 'role' in allowed_keys:
        data['role'] = user.get('role', 'user')
    if 'is_active' in allowed_keys:
        data['is_active'] = 1

    # Try update if user with same username or email or phone exists
    cur.execute("SELECT id FROM users WHERE username = ? OR email = ? OR phone = ?", (user['username'], user['email'], user.get('phone')))
    row = cur.fetchone()
    if row:
        user_id = row[0]
        # Build update stmt for fields except id, created_at
        update_parts = []
        values = []
        for k, v in data.items():
            if k in ('id', 'created_at'):
                continue
            update_parts.append(f"{k} = ?")
            values.append(v)
        values.append(user_id)
        if update_parts:
            stmt = f"UPDATE users SET {', '.join(update_parts)} WHERE id = ?"
            cur.execute(stmt, values)
            print(f'Updated user {user["username"]}')
    else:
        # Insert new user
        cols = ', '.join(data.keys())
        placeholders = ', '.join(['?'] * len(data))
        stmt = f"INSERT INTO users ({cols}) VALUES ({placeholders})"
        cur.execute(stmt, tuple(data.values()))
        print(f'Inserted user {user["username"]}')


def main():
    if not os.path.exists(DB_PATH):
        print('Database not found at', DB_PATH)
        return

    ensure_schema()

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Fetch existing columns
    cur.execute("PRAGMA table_info(users);")
    rows = cur.fetchall()
    existing_columns = {r[1] for r in rows}
    print('Existing users columns:', existing_columns)

    # Ensure password_hash column exists; if not, but password is stored differently, try to adapt
    if 'password_hash' not in existing_columns:
        # If app stores passwords in a different column, abort to avoid corrupting
        print('users table missing password_hash column; aborting seeding to avoid corrupting auth data')
        conn.close()
        return

    upsert_user(conn, ADMIN_USER, existing_columns)
    upsert_user(conn, DEMO_USER, existing_columns)

    conn.commit()
    conn.close()
    print('Seeding complete')


if __name__ == '__main__':
    main()
