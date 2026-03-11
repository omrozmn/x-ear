from core.database import SessionLocal
from core.models.user import User
from passlib.context import CryptContext
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
s = SessionLocal()
u = s.query(User).filter(User.email == "apitest@xear.com").first()
if u:
    new_hash = pwd_ctx.hash("test123")
    u.password_hash = new_hash
    s.commit()
    print("Password set with venv python")
    print(f"New hash: {new_hash[:40]}...")
    u2 = s.query(User).filter(User.email == "apitest@xear.com").first()
    print(f"Verify: {u2.check_password('test123')}")
else:
    print("User not found")
s.close()
