from datetime import datetime, timedelta
from jose import jwt

SECRET_KEY = "super-secret-jwt-key-for-development"
ALGORITHM = "HS256"

def create_access_token(identity: str, tenant_id: str):
    expire = datetime.utcnow() + timedelta(hours=8)
    to_encode = {
        "sub": identity,
        "exp": expire,
        "iat": datetime.utcnow(),
        "access.tenant_id": tenant_id,
        "role": "admin",
        "tenant_id": tenant_id
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Deneme tenant - real user
token = create_access_token("usr_eafaadc6", "95625589-a4ad-41ff-a99e-4955943bb421")
print(token)
