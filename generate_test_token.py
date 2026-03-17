import jwt
import sqlite3
from datetime import datetime, timedelta

# Get user from database
conn = sqlite3.connect('apps/api/instance/xear_crm.db')
cursor = conn.cursor()
cursor.execute("SELECT id, email, role, tenant_id FROM users WHERE tenant_id IS NOT NULL LIMIT 1")
user = cursor.fetchone()
conn.close()

if not user:
    print("No user found!")
    exit(1)

user_id, email, role, tenant_id = user

# Create JWT token
payload = {
    'sub': user_id,
    'email': email,
    'role': role,
    'tenant_id': tenant_id,
    'exp': datetime.utcnow() + timedelta(days=30)
}

# Get JWT secret from .env
import os
secret = os.getenv('JWT_SECRET', 'your-secret-key-here-change-in-production')

token = jwt.encode(payload, secret, algorithm='HS256')
print(token)
