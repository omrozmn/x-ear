
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models.user import User
from passlib.context import CryptContext

db = SessionLocal()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

user = db.query(User).filter(User.email == 'tenantadmin@test.com').first()
if user:
    print(f"Found User: {user.email}")
    user.hashed_password = pwd_context.hash("Demo123!")
    db.commit()
    print("Password KEYKESINLIKLE reset to Demo123!")
else:
    print("User not found!")
