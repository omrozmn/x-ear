import sys
import os
sys.path.append(os.path.abspath('/Users/ozmen/Desktop/x-ear web app/x-ear/apps/api'))
from core.database import SessionLocal
from services.affiliate_service import AffiliateService

db = SessionLocal()
try:
    user = AffiliateService.authenticate(db, "testaffiliate100@example.com", "password123")
    print("SUCCESS" if user else "FAIL")
    if user:
        from core.security import create_access_token
        print("TRYING TO CREATE TOKEN")
        token = create_access_token(identity=user.id)
        print("TOKEN CREATED:", token)
except Exception as e:
    print("EXCEPTION:", repr(e))
