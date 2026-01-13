"""Quick admin panel data seeder - adds minimal test data to all empty pages"""
import sys, os, random
from datetime import datetime, timedelta
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app import app
from models.base import db, gen_id
from models.tenant import Tenant
from models.marketplace import MarketplaceIntegration
from models.ocr_job import OCRJob
from models.scan_queue import ScanQueue
from models.notification import Notification
from utils.tenant_security import _skip_filter

def quick_seed():
    with app.app_context():
        _skip_filter.set(True)
        
        print("🚀 Quick Admin Panel Data Seeder")
        print("="*50)
        
        tenants = Tenant.query.all()
        if not tenants:
            print("❌ No tenants found!")
            return
        
        tenant_ids = [t.id for t in tenants]
        print(f"Found {len(tenants)} tenants\n")
        
        # Marketplaces
        print("📦 Seeding Marketplaces...")
        marketplace_count = 0
        for tid in tenant_ids[:2]:  # İlk 2 tenant
            for platform in ['trendyol', 'hepsiburada', 'n11']:
                if not MarketplaceIntegration.query.filter_by(tenant_id=tid, platform=platform).first():
                    mi = MarketplaceIntegration(
                        tenant_id=tid,
                        platform=platform,
                        is_active=random.choice([True, False]),
                        credentials='{"api_key": "test_key"}',
                    )
                    db.session.add(mi)
                    marketplace_count += 1
        db.session.commit()
        print(f"   ✓ Added {marketplace_count} marketplaces\n")
        
        # OCR Queue
        print("📄 Seeding OCR Queue...")
        ocr_count = 0
        for _ in range(10):
            tid = random.choice(tenant_ids)
            sq = ScanQueue(
                tenant_id=tid,
                file_path=f"/uploads/test_{gen_id('doc')}.pdf",
                status=random.choice(['pending', 'processing', 'completed', 'failed']),
                created_at=datetime.now() - timedelta(days=random.randint(0, 30))
            )
            db.session.add(sq)
            ocr_count += 1
        db.session.commit()
        print(f"   ✓ Added {ocr_count} OCR queue items\n")
        
        # Notifications (for Support page)
        print("🔔 Seeding Notifications/Support...")
        notif_count = 0
        for _ in range(15):
            tid = random.choice(tenant_ids)
            n = Notification(
                tenant_id=tid,
                title=f"Test Notification {random.randint(1, 100)}",
                message=f"Test message for support ticket {random.randint(1, 100)}",
                type=random.choice(['info', 'warning', 'success', 'error']),
                is_read=random.choice([True, False]),
                created_at=datetime.now() - timedelta(days=random.randint(0, 60))
            )
            db.session.add(n)
            notif_count += 1
        db.session.commit()
        print(f"   ✓ Added {notif_count} notifications\n")
        
        print("="*50)
        print("✅ DONE!")
        print(f"   - {marketplace_count} Marketplaces")
        print(f"   - {ocr_count} OCR Queue Items")
        print(f"   - {notif_count} Notifications")
        print("\n🎉 Admin panel sayfalarını yenileyin!")

if __name__ == "__main__":
    quick_seed()
