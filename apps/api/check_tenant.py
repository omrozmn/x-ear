from __future__ import annotations
import sys

# Add apps/api to path
sys.path.insert(0, "/Users/ozmen/Desktop/x-ear web app/x-ear/apps/api")

from core.database import SessionLocal
from models.tenant import Tenant

session = SessionLocal()
tenant = session.query(Tenant).filter_by(id='tenant_001').first()

if tenant:
    print(f"Tenant: {tenant.name}")
    print(f"Settings: {tenant.settings}")
else:
    print("Tenant not found")

session.close()
