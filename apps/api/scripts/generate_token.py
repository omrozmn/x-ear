import os
import sys
from datetime import datetime, timedelta, timezone
from jose import jwt

# Add backend to path to perhaps import user model? 
# No, let's just generate a raw token with expected claims.

SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'default-dev-secret-key-change-in-prod')
ALGORITHM = "HS256"

def create_test_token(user_id="test_user", tenant_id="test_tenant", role="admin"):
    expire = datetime.now(timezone.utc) + timedelta(minutes=30)
    to_encode = {
        "sub": user_id,
        "tenant_id": tenant_id,
        "role": role,
        "exp": expire
    }
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

if __name__ == "__main__":
    token = create_test_token()
    print(f"Bearer {token}")
