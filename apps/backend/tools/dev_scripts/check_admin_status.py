
from app import app
from models.user import User
from models.admin_user import AdminUser
from sqlalchemy import text

def check_admin():
    with app.app_context():
        print(f"Checking database: {app.config['SQLALCHEMY_DATABASE_URI']}")
        
        # Check User table (Tenant Users)
        user = User.query.filter_by(email='admin@x-ear.com').first()
        if user:
            print(f"Found in User table: ID={user.id}, Role={user.role}, Tenant={user.tenant_id}")
        else:
            print("Not found in User table.")

        # Check AdminUser table (Platform Admins)
        try:
            admin = AdminUser.query.filter_by(email='admin@x-ear.com').first()
            if admin:
                print(f"Found in AdminUser table: ID={admin.id}, Role={admin.role}")
            else:
                print("Not found in AdminUser table.")
        except Exception as e:
            print(f"Could not check AdminUser table: {e}")
            
        # Check for Affiliate table
        try:
            from models.affiliate_user import AffiliateUser
            count = AffiliateUser.query.count()
            print(f"AffiliateUser table exists. Count: {count}")
        except Exception as e:
             print(f"AffiliateUser table check failed: {e}")

if __name__ == "__main__":
    check_admin()
