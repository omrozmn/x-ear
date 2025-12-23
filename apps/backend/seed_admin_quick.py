"""
Quick seed for admin panel

Run: python seed_admin_quick.py
"""

from app import app, db
from models import (
    Tenant, User, SMSHeaderRequest, SMSPackage, Campaign
)
from datetime import datetime, timedelta
import random

def seed_admin_data():
    """Quick seed for admin panel testing"""
    with app.app_context():
        print("🌱 Seeding admin panel test data...")
        
        tenants = Tenant.query.limit(10).all()
        if not tenants:
            print("❌ No tenants found! Please create tenants first.")
            return
        
        # SMS Header Requests - add more
        print("\n📨 Adding SMS header requests...")
        existing_count = SMSHeaderRequest.query.count()
        for tenant in tenants:
            for _ in range(2):
                header = SMSHeaderRequest(
                    tenant_id=tenant.id,
                    header_text=tenant.name[:11].upper().replace(' ', ''),
                    header_type=random.choice(['company_title', 'trademark', 'domain']),
                    status=random.choice(['pending', 'approved', 'rejected']),
                    documents_json=[],
                    created_at=datetime.utcnow() - timedelta(days=random.randint(1, 30))
                )
                db.session.add(header)
        db.session.commit()
        new_count = SMSHeaderRequest.query.count()
        print(f"✅ SMS Headers: {existing_count} → {new_count}")
        
        #  SMS Packages
        print("\n📦 Checking SMS packages...")
        pkg_count = SMSPackage.query.count()
        if pkg_count == 0:
            print("Creating SMS packages...")
            packages = [
                {"name": "Başlangıç Paketi", "count": 1000, "price": 100},
                {"name": "Standart Paket", "count": 5000, "price": 450},
                {"name": "Premium Paket", "count": 10000, "price": 800},
                {"name": "Kurumsal Paket", "count": 50000, "price": 3500},
            ]
            for pkg in packages:
                p = SMSPackage(
                    name=pkg["name"],
                    sms_count=pkg["count"],
                    price=pkg["price"],
                    currency="TRY",
                    is_active=True
                )
                db.session.add(p)
            db.session.commit()
        print(f"✅ SMS Packages: {SMSPackage.query.count()}")
        
        print("\n🎉 Seeding complete!")

if __name__ == '__main__':
    seed_admin_data()
