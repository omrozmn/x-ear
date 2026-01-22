from werkzeug.security import generate_password_hash
import sqlite3

# Generate hash for testpass123
password_hash = generate_password_hash("testpass123", method='scrypt')
print(f"Generated hash: {password_hash}")

# Update database
conn = sqlite3.connect('instance/xear_crm.db')
cursor = conn.cursor()
cursor.execute("UPDATE users SET password_hash = ? WHERE tenant_id = 'test-tenant-001'", (password_hash,))
conn.commit()
print(f"Updated {cursor.rowcount} rows")
conn.close()
print("Password updated successfully!")
