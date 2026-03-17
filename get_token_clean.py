#!/usr/bin/env python3
import sys
import os
import logging

# Suppress all logging to avoid debug output in token
logging.getLogger().setLevel(logging.CRITICAL)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps/api'))

# Suppress database debug output
os.environ['SQLALCHEMY_ECHO'] = 'false'

from core.database import SessionLocal
from core.models.user import User
from routers.auth import create_access_token

db = SessionLocal()
try:
    # Find a user in the "deneme" tenant
    user = db.query(User).filter(User.tenant_id == "95625589-a4ad-41ff-a99e-4955943bb421").first()
    if user:
        token = create_access_token({"sub": user.id, "tenant_id": user.tenant_id})
        # Only print the token, nothing else
        sys.stdout.write(token)
        sys.stdout.flush()
    else:
        sys.exit(1)
except Exception:
    sys.exit(1)
finally:
    db.close()