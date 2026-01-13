import sys
import os
# Add backend root to path to allow imports from app, models, etc.
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
import sys
import os

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app
from models.tenant import Tenant
from models.base import db

with app.app_context():
    try:
        # Check all tenants
        all_count = Tenant.query.count()
        print(f"Total tenants in DB: {all_count}")
        
        # Check active (not deleted) tenants
        active_count = Tenant.query.filter(Tenant.deleted_at.is_(None)).count()
        print(f"Active (not deleted) tenants: {active_count}")
        
        if active_count > 0:
            tenants = Tenant.query.filter(Tenant.deleted_at.is_(None)).limit(5).all()
            for t in tenants:
                print(f"Active Tenant: {t.name} (ID: {t.id}, Status: {t.status})")
        else:
            print("No active tenants found (all might be soft-deleted).")
            
    except Exception as e:
        print(f"Error querying tenants: {e}")
