#!/usr/bin/env python3
import sys
import os
import logging

# Completely suppress all logging
logging.disable(logging.CRITICAL)

# Set environment variables to suppress debug output
os.environ['SQLALCHEMY_ECHO'] = 'False'
os.environ['SQLALCHEMY_WARN_20'] = 'False'

# Redirect stderr to devnull to suppress any remaining debug output
import io
sys.stderr = io.StringIO()

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps/api'))

try:
    from core.database import SessionLocal
    from core.models.user import User
    from routers.auth import create_access_token
    
    db = SessionLocal()
    try:
        # Find a user in the "deneme" tenant
        user = db.query(User).filter(User.tenant_id == "95625589-a4ad-41ff-a99e-4955943bb421").first()
        if user:
            token = create_access_token({"sub": user.id, "tenant_id": user.tenant_id})
            # Only output the token, nothing else
            print(token, end='')
        else:
            sys.exit(1)
    finally:
        db.close()
except:
    sys.exit(1)