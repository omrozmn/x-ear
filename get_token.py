#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps/api'))
from core.database import SessionLocal
from core.models.user import User
from routers.auth import create_access_token

db = SessionLocal()
try:
    # Find a user in the "deneme" tenant
    user = db.query(User).filter(User.tenant_id == "95625589-a4ad-41ff-a99e-4955943bb421").first()
    if user:
        token = create_access_token({"sub": user.id, "tenant_id": user.tenant_id})
        print(token)
    else:
        print("ERROR: No user found in tenant 'deneme'", file=sys.stderr)
        sys.exit(1)
except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(1)
finally:
    db.close()
