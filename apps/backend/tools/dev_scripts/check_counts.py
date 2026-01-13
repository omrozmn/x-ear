
from app import app
from models.user import User
from models.tenant import Tenant
from utils.tenant_security import _skip_filter
from sqlalchemy import text
from models.base import db

def check_counts():
    with app.app_context():
        _skip_filter.set(True)
        print("\nChecking Alembic Version:")
        try:
            ver = db.session.execute(text("SELECT * FROM alembic_version")).fetchall()
            print(f"Migration Version: {ver}")
        except Exception as e:
            print(f"No alembic_version table: {e}")

        print("\nListing Tables:")
        try:
            tables = db.session.execute(text("SELECT name FROM sqlite_master WHERE type='table';")).fetchall()
            for t in tables:
                print(f"- {t[0]}")
        except Exception as e:
            print(f"Could not list tables: {e}")
            
        u_count = User.query.count()
        t_count = Tenant.query.count()
        print(f"\nTotal Users: {u_count}")
        print(f"Total Tenants: {t_count}")

if __name__ == "__main__":
    check_counts()
