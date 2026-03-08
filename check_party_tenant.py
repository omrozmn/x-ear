#!/usr/bin/env python3
import sys
sys.path.insert(0, 'apps/api')

from core.database import get_db
from core.models import Party

db = next(get_db())
try:
    party = db.query(Party).filter(Party.id == 'pat_5d88ce9f').first()
    if party:
        print(f"Party ID: {party.id}")
        print(f"Party Name: {party.first_name} {party.last_name}")
        print(f"Party Tenant ID: {party.tenant_id}")
        print("\nJWT tenant_id: 95625589-a4ad-41ff-a99e-4955943bb421")
        print(f"Match: {party.tenant_id == '95625589-a4ad-41ff-a99e-4955943bb421'}")
    else:
        print("Party not found in database")
finally:
    db.close()
