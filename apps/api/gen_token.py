import os
from datetime import datetime, timedelta
from jose import jwt

SECRET_KEY = "super-secret-jwt-key-for-development"
ALGORITHM = "HS256"

def create_access_token(identity: str):
    expire = datetime.utcnow() + timedelta(hours=8)
    to_encode = {
        "sub": identity,
        "exp": expire,
        "iat": datetime.utcnow(),
        "access.tenant_id": "tenant_123", # Dummy tenant
        "role": "admin",
        "tenant_id": "tenant_123"
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

print(create_access_token("usr_8cf5d068"))
