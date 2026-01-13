import sys
import os
# Add backend root to path to allow imports from app, models, etc.
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
from app import app, db
from models.tenant import Tenant
from models.user import User
from models.admin_user import AdminUser

def check_db():
    with app.app_context():
        print("Checking DB content...")
        tenants = Tenant.query.all()
        print(f"Tenants: {len(tenants)}")
        for t in tenants:
            print(f" - {t.name} ({t.id})")
            
        users = User.query.all()
        print(f"Users: {len(users)}")
        for u in users:
            print(f" - {u.username} ({u.id}) tenant={u.tenant_id}")
            
        admin_users = AdminUser.query.all()
        print(f"AdminUsers: {len(admin_users)}")
        for u in admin_users:
            print(f" - {u.email} ({u.id})")

if __name__ == "__main__":
    check_db()
