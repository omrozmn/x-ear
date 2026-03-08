from __future__ import annotations
import sys
from sqlalchemy.orm.attributes import flag_modified

# Add apps/api to path
sys.path.insert(0, "/Users/ozmen/Desktop/x-ear web app/x-ear/apps/api")

from core.database import SessionLocal
from models.tenant import Tenant

session = SessionLocal()
tenant = session.query(Tenant).filter_by(id='tenant_001').first()

if tenant:
    if not tenant.settings:
        tenant.settings = {}
    
    tenant.settings['pos_integration'] = {
        'provider': 'paytr',
        'enabled': True,
        'merchant_id': '123456',
        'merchant_key': 'dummy_key',
        'merchant_salt': 'dummy_salt',
        'test_mode': True
    }
    flag_modified(tenant, "settings")
    session.commit()
    print("Tenant settings updated.")
else:
    print("Tenant not found")

session.close()
