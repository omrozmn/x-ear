import sqlite3
import os
from passlib.context import CryptContext

db_path = "/Users/ozmen/Desktop/x-ear web app/x-ear/apps/api/instance/xear_crm.db"
# Use pbkdf2_sha256 instead of bcrypt to avoid version issues in this environment
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
hashed_password = pwd_context.hash("Test123!")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Create e2etest user if not exists
cursor.execute("SELECT id FROM users WHERE username='e2etest'")
user = cursor.fetchone()

if not user:
    cursor.execute("""
        INSERT INTO users (id, username, email, phone, password_hash, role, is_active, is_phone_verified, tenant_id, permissions_version)
        VALUES ('usr_e2etest', 'e2etest', 'e2etest@xear.com', '+905550000000', ?, 'ADMIN', 1, 1, 'tenant_001', 1)
    """, (hashed_password,))
    print(f"User e2etest created with hash: {hashed_password}")
else:
    cursor.execute("UPDATE users SET password_hash=?, is_active=1, is_phone_verified=1 WHERE username='e2etest'", (hashed_password,))
    print(f"User e2etest updated with hash: {hashed_password}")

conn.commit()
conn.close()
