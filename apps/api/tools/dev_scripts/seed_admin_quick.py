import sys
import os
# Add backend root to path to allow imports from app, models, etc.
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from database import SessionLocal, UnboundSession
from models.tenant import Tenant
from models.user import User
from models.sms_package import SmsPackage
from models.campaign import Campaign
from models.sms_integration import SMSHeaderRequest
from datetime import datetime, timedelta
import random

def seed_admin_data():
    """Quick seed for admin panel testing"""
    db = SessionLocal()
    try:
        print("🌱 Seeding admin panel test data...")
        
        # Bypass tenant filter to see all tenants
        with UnboundSession():
            tenants = db.query(Tenant).limit(10).all()
            if not tenants:
                print("❌ No tenants found! Please create tenants first.")
                return
            
            # SMS Header Requests - add more
            print("\n📨 Adding SMS header requests...")
            # Use correct class name SMSHeaderRequest
            existing_count = db.query(SMSHeaderRequest).count()
            for tenant in tenants:
                for _ in range(2):
                    header = SMSHeaderRequest(
                        tenant_id=tenant.id,
                        header_text=tenant.name[:11].upper().replace(' ', ''),
                        header_type=random.choice(['company_title', 'trademark', 'domain']),
                        status=random.choice(['pending', 'approved', 'rejected']),
                        documents_json=[],
                        # created_at might not be in init if it's default func, but SQLAlchemy models allow it if column exists
                        # models/sms_integration.py doesn't show created_at in __init__ but it inherits BaseModel?
                        # BaseModel usually has created_at properly.
                    )
                    # Manually set created_at if needed, strict check might fail if not in init args
                    # but typically okay with declarative base.
                    # header.created_at = ...
                    db.add(header)
            db.commit()
            new_count = db.query(SMSHeaderRequest).count()
            print(f"✅ SMS Headers: {existing_count} → {new_count}")
            
            # SMS Packages
            print("\n📦 Checking SMS packages...")
            # Use correct class name SmsPackage
            pkg_count = db.query(SmsPackage).count()
            if pkg_count == 0:
                print("Creating SMS packages...")
                packages = [
                    {"name": "Başlangıç Paketi", "count": 1000, "price": 100},
                    {"name": "Standart Paket", "count": 5000, "price": 450},
                    {"name": "Premium Paket", "count": 10000, "price": 800},
                    {"name": "Kurumsal Paket", "count": 50000, "price": 3500},
                ]
                for pkg in packages:
                    p = SmsPackage(
                        name=pkg["name"],
                        sms_count=pkg["count"],
                        price=pkg["price"],
                        currency="TRY",
                        is_active=True
                    )
                    db.add(p)
                db.commit()
            print(f"✅ SMS Packages: {db.query(SmsPackage).count()}")
            
            print("\n🎉 Seeding complete!")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == '__main__':
    seed_admin_data()
