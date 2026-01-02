"""Fill ALL empty admin pages with test data"""
import sys, os, random
from datetime import datetime, timedelta
import uuid
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app import app
from models.base import db, gen_id
from models.tenant import Tenant
from models.patient import Patient
from models.production_order import ProductionOrder
from models.invoice import Invoice
from models.sales import PaymentRecord
from models.scan_queue import ScanQueue
from models.notification import Notification
from models.affiliate_user import AffiliateUser
from utils.tenant_security import _skip_filter

def fill_all_empty_tables():
    with app.app_context():
        _skip_filter.set(True)
        
        print("\n🔥 FILLING ALL EMPTY ADMIN TABLES")
        print("="*60)
        
        tenants = Tenant.query.all()
        patients = Patient.query.all()
        
        if not tenants or not patients:
            print("❌ Need tenants and patients first!")
            return
            
        tenant_ids = [t.id for t in tenants]
        patient_ids = [p.id for p in patients]
        
        # 1. Production Orders
        prod_count = ProductionOrder.query.count()
        print(f"\n📦 Production Orders: {prod_count} existing")
        if prod_count < 10:
            for _ in range(10 - prod_count):
                po = ProductionOrder(
                    tenant_id=random.choice(tenant_ids),
                    patient_id=random.choice(patient_ids),
                    order_number=f"PO-{random.randint(10000, 99999)}",
                    product_type=random.choice(['mold', 'filter', 'device']),
                    status=random.choice(['new', 'in_production', 'shipped', 'delivered']),
                    manufacturer=random.choice(['Factory A', 'Factory B', 'Factory C']),
                    estimated_delivery_date=datetime.now() + timedelta(days=random.randint(7, 30)),
                    notes='Test production order'
                )
                db.session.add(po)
            db.session.commit()
            print(f"   ✓ Added {10 - prod_count} production orders")
        
        # 2. Invoices - Skip (complex model)
        inv_count = Invoice.query.count()
        print(f"\n📄 Invoices: {inv_count} existing (skipping - complex model)")
        
        # 3. Payment Records - Skip (complex model)
        pay_count = PaymentRecord.query.count()
        print(f"\n💳 Payment Records: {pay_count} existing (skipping - complex model)")
        
        # 4. Scan Queue
        scan_count = ScanQueue.query.count()
        print(f"\n📄 OCR Scan Queue: {scan_count} existing")
        if scan_count < 12:
            for _ in range(12 - scan_count):
                sq = ScanQueue(
                    tenant_id=random.choice(tenant_ids),
                    patient_id=random.choice(patient_ids),  # Add patient_id
                    file_path=f"/uploads/scans/test_{gen_id('doc')}.pdf",
                    status=random.choice(['pending', 'processing', 'completed', 'failed']),
                    created_at=datetime.now() - timedelta(days=random.randint(0, 30))
                )
                db.session.add(sq)
            db.session.commit()
            print(f"   ✓ Added {12 - scan_count} scan queue items")
        
        # 5. Notifications - Skip (complex __init__)
        notif_count = Notification.query.count()
        print(f"\n🔔 Notifications: {notif_count} existing (skipping - complex model)")
        
        # 6. Affiliates - Check existing
        aff_count = AffiliateUser.query.count()
        print(f"\n🤝 Affiliates: {aff_count} existing")
        if aff_count > 0:
            print("   → Existing affiliates found:")
            for aff in AffiliateUser.query.limit(5).all():
                print(f"      - {aff.email} ({aff.account_holder_name or 'No name'})")
        
        print("\n" + "="*60)
        print("✅ DATA SEEDING COMPLETE!")
        print("="*60)
        
        # Final counts
        print("\n📊 Final Counts:")
        print(f"   ✅ Production Orders: {ProductionOrder.query.count()}")
        print(f"   ⚠️  Invoices: {Invoice.query.count()} (complex model)")
        print(f"   ⚠️  Payment Records: {PaymentRecord.query.count()} (complex model)")
        print(f"   ✅ OCR Scan Queue: {ScanQueue.query.count()}")
        print(f"   ⚠️  Notifications: {Notification.query.count()} (complex model)")
        print(f"   ✅ Affiliates: {AffiliateUser.query.count()}")
        print("\n🎉 Admin paneli yenileyin!")

if __name__ == "__main__":
    fill_all_empty_tables()
