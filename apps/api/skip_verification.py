
import sys
import os

# Add local directory to path
sys.path.append(os.getcwd())

from sqlalchemy import create_engine, text
from core.database import DATABASE_URL

print(f"Connecting to database: {DATABASE_URL}")
engine = create_engine(DATABASE_URL)

email = "admin@x-ear.com"

with engine.connect() as conn:
    # Update user to be phone verified and have a dummy phone number if null
    # This prevents the modal from appearing
    conn.execute(
        text("UPDATE users SET is_phone_verified=1, phone='+905555555555' WHERE email = :email"),
        {"email": email}
    )
    conn.commit()
    print(f"Manually verified phone for {email}")
