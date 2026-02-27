from __future__ import annotations
from typing import Optional, Any, Union, List, Dict
import sys
import os

# Add apps/api to path
sys.path.insert(0, "/Users/ozmen/Desktop/x-ear web app/x-ear/apps/api")

from core.database import SessionLocal
from models.user import User

session = SessionLocal()
user = session.query(User).filter_by(username='e2etest').first()

if user:
    print(f"User: {user.username}")
    print(f"Role: {user.role}")
    print(f"Tenant: {user.tenant_id}")
else:
    print("User not found")

session.close()
