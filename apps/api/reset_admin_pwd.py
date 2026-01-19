
import sys
import os

# Add local directory to path so we can import app modules
sys.path.append(os.getcwd())

from werkzeug.security import generate_password_hash
from sqlalchemy import create_engine, text
from core.database import DATABASE_URL

print(f"Connecting to database: {DATABASE_URL}")
engine = create_engine(DATABASE_URL)

email = "admin@x-ear.com"
new_password = "admin"
hashed_password = generate_password_hash(new_password, method='pbkdf2:sha256')

with engine.connect() as conn:
    # Check if user exists
    result = conn.execute(text("SELECT id FROM users WHERE email = :email"), {"email": email}).fetchone()
    
    if result:
        print(f"User found: {email} (ID: {result[0]})")
        # Update password
        conn.execute(
            text("UPDATE users SET password_hash = :pwd WHERE email = :email"),
            {"pwd": hashed_password, "email": email}
        )
        conn.commit()
        print(f"Password reset successfully for {email} to '{new_password}'")
    else:
        print(f"User {email} not found!")

