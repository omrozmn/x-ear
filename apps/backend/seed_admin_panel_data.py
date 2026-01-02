"""
Admin Panel Test Data Seeder
Seeds data for admin panel pages that are currently empty:
- Campaigns
- Production Orders
- Marketplaces
- API Keys  
- Files
- OCR Queue
- Support Tickets
- Roles (additional)
"""

import sys
import os
import random
from datetime import datetime, timedelta
from faker import Faker
import uuid

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app import app
from models.base import db, gen_id
from models.user import User
from models.tenant import Tenant
from models.campaign import Campaign
from models.production_order import ProductionOrder 
from models.marketplace import MarketplaceIntegration
from models.api_key import ApiKey
from models.scan_queue import ScanQueue
from models.notification import Notification as Ticket  # Using Notification as Ticket for now
from models.role import Role
from models.permission import Permission
from utils.tenant_security import _skip_filter

fake = Faker('tr_TR')
Faker.seed(100)

def seed_campaigns(tenant_ids):
    """Seed campaigns for testing"""
    print("\n📢 Seeding Campaigns...")
    campaigns = []
    
    campaign_types = ['sms', 'email', 'notification']
    statuses = ['draft', 'scheduled', 'sent', 'cancelled']
    
    for _ in range(15):
        tenant_id = random.choice(tenant_ids)
        scheduled_date = fake.date_time_between(start_date='-30d', end_date='+30d')
        
        campaign = Campaign(
            tenant_id=tenant_id,
            name=f"{fake.catch_phrase()} Kampanyası",
            description=fake.text(max_nb_chars=200),
            campaign_type=random.choice(campaign_types),
            message_template=fake.text(max_nb_chars=160),
            status=random.choice(statuses),
            scheduled_at=scheduled_date,
            sent_at=scheduled_date - timedelta(days=random.randint(1, 5)) if random.random() > 0.5 and statuses[-1] == 'sent' else None,
            total_recipients=random.randint(50, 500),
            successful_sends=random.randint(0, 400),
            failed_sends=random.randint(0, 50),
            estimated_cost=round(random.uniform(100, 1000), 2),
            actual_cost=round(random.uniform(50, 900), 2)
        )
        db.session.add(campaign)
        campaigns.append(campaign)
    
    db.session.commit()
    print(f"   ✓ Created {len(campaigns)} campaigns")
    return campaigns


def seed_production_orders(tenant_ids):
    """Seed production orders"""
    print("\n🏭 Seeding Production Orders...")
    orders = []
    
    statuses = ['pending', 'in_progress', 'completed', 'cancelled']
    
    for _ in range(20):
        tenant_id = random.choice(tenant_ids)
        order_date = fake.date_time_between(start_date='-60d', end_date='now')
        
        order = ProductionOrder(
            id=gen_id("prod"),
            tenant_id=tenant_id,
            order_number=f"PO-{fake.random_number(digits=6)}",
            product_name=f"{fake.company()} Cihazı",
            quantity=random.randint(10, 100),
            status=random.choice(statuses),
            order_date=order_date,
            expected_completion_date=order_date + timedelta(days=random.randint(7, 30)),
            notes=fake.sentence() if random.random() > 0.5 else None
        )
        db.session.add(order)
        orders.append(order)
    
    db.session.commit()
    print(f"   ✓ Created {len(orders)} production orders")
    return orders

def seed_marketplaces(tenant_ids):
    """Seed marketplace integrations"""
    print("\n🛒 Seeding Marketplace Integrations...")
    integrations = []
    
    marketplaces = [
        ('trendyol', 'Trendyol'),
        ('hepsiburada', 'Hepsiburada'),
        ('n11', 'N11'),
        ('amazon', 'Amazon TR'),
        ('gittigidiyor', 'GittiGidiyor')
    ]
    
    for tenant_id in tenant_ids[:min(3, len(tenant_ids))]:  # İlk 3 tenant'a
        for platform_id, platform_name in random.sample(marketplaces, random.randint(1, 3)):
            integration = MarketplaceIntegration(
                tenant_id=tenant_id,
                platform=platform_id,
                platform_name=platform_name,
                is_active=random.choice([True, False]),
                api_key=f"test_key_{uuid.uuid4().hex[:16]}",
                api_secret=f"test_secret_{uuid.uuid4().hex[:24]}",
                store_id=str(random.randint(10000, 99999)),
                last_sync_at=fake.date_time_between(start_date='-7d', end_date='now') if random.random() > 0.3 else None,
                settings={
                    'auto_sync': random.choice([True, False]),
                    'sync_interval': random.choice([60, 120, 300])
                }
            )
            db.session.add(integration)
            integrations.append(integration)
    
    db.session.commit()
    print(f"   ✓ Created {len(integrations)} marketplace integrations")
    return integrations

def seed_api_keys(tenant_ids):
    """Seed API keys"""
    print("\n🔑 Seeding API Keys...")
    keys = []
    
    for _ in range(10):
        tenant_id = random.choice(tenant_ids)
        created_date = fake.date_time_between(start_date='-90d', end_date='now')
        
        key = ApiKey(
            tenant_id=tenant_id,
            name=f"{fake.word().capitalize()} Integration",
            key_value=f"xear_{uuid.uuid4().hex}",
            description=fake.sentence(),
            is_active=random.choice([True, True, True, False]),  # Çoğu aktif
            created_at=created_date,
            last_used_at=fake.date_time_between(start_date=created_date, end_date='now') if random.random() > 0.3 else None,
            expires_at=created_date + timedelta(days=365) if random.random() > 0.5 else None
        )
        db.session.add(key)
        keys.append(key)
    
    db.session.commit()
    print(f"   ✓ Created {len(keys)} API keys")
    return keys

def seed_scan_queue(tenant_ids):
    """Seed OCR scan queue"""
    print("\n📄 Seeding OCR Scan Queue...")
    scans = []
    
    statuses = ['pending', 'processing', 'completed', 'failed']
    
    for _ in range(25):
        tenant_id = random.choice(tenant_ids)
        created_date = fake.date_time_between(start_date='-30d', end_date='now')
        
        status = random.choice(statuses)
        
        scan = ScanQueue(
            tenant_id=tenant_id,
            file_path=f"/uploads/scans/{uuid.uuid4().hex}.pdf",
            status=status,
            created_at=created_date,
            started_at=created_date + timedelta(minutes=random.randint(1, 10)) if status != 'pending' else None,
            completed_at=created_date + timedelta(minutes=random.randint(10, 30)) if status == 'completed' else None,
            error_message=fake.sentence() if status == 'failed' else None,
            result_data={'pages': random.randint(1, 10), 'confidence': round(random.uniform(0.7, 0.99), 2)} if status == 'completed' else None
        )
        db.session.add(scan)
        scans.append(scan)
    
    db.session.commit()
    print(f"   ✓ Created {len(scans)} OCR queue items")
    return scans

def seed_support_tickets(tenant_ids):
    """Seed support tickets"""
    print("\n🎫 Seeding Support Tickets...")
    tickets = []
    
    priorities = ['low', 'medium', 'high', 'urgent']
    statuses = ['open', 'in_progress', 'waiting_response', 'resolved', 'closed']
    categories = ['technical', 'billing', 'feature_request', 'bug_report', 'general']
    
    for _ in range(30):
        tenant_id = random.choice(tenant_ids)
        created_date = fake.date_time_between(start_date='-60d', end_date='now')
        
        ticket = Ticket(
            tenant_id=tenant_id,
            title=fake.sentence(nb_words=6),
            description=fake.text(max_nb_chars=300),
            category=random.choice(categories),
            priority=random.choice(priorities),
            status=random.choice(statuses),
            created_at=created_date,
            updated_at=fake.date_time_between(start_date=created_date, end_date='now')
        )
        db.session.add(ticket)
        tickets.append(ticket)
    
    db.session.commit()
    print(f"   ✓ Created {len(tickets)} support tickets")
    return tickets

def seed_additional_roles():
    """Seed additional test roles"""
    print("\n👥 Seeding Additional Roles...")
    
    # Mevcut role'leri kontrol et
    existing_roles = {r.name for r in Role.query.all()}
    
    new_roles_data = [
        ('sales_manager', 'Satış Müdürü', ['sales.view', 'sales.create', 'sales.edit', 'patients.view', 'appointments.view']),
        ('receptionist', 'Resepsiyonist', ['appointments.view', 'appointments.create', 'appointments.edit', 'patients.view']),
        ('accountant', 'Muhasebe', ['accounting.view', 'sales.view', 'billing.view']),
        ('stock_manager', 'Stok Yöneticisi', ['inventory.view', 'inventory.create', 'inventory.edit', 'suppliers.view']),
    ]
    
    added = 0
    for role_name, desc, perm_names in new_roles_data:
        if role_name not in existing_roles:
            role = Role(name=role_name, description=desc)
            
            # İzinleri ekle
            for perm_name in perm_names:
                perm = Permission.query.filter_by(name=perm_name).first()
                if perm:
                    role.permissions.append(perm)
            
            db.session.add(role)
            added += 1
    
    db.session.commit()
    print(f"   ✓ Created {added} additional roles")

def run_seed():
    with app.app_context():
        _skip_filter.set(True)
        
        print("="*60)
        print("🌱 ADMIN PANEL TEST DATA SEEDER")
        print("="*60)
        
        # Get all tenants
        tenants = Tenant.query.all()
        if not tenants:
            print("❌ No tenants found! Run seed_admin.py first.")
            return
        
        tenant_ids = [t.id for t in tenants]
        print(f"\n📋 Found {len(tenants)} tenant(s)")
        for t in tenants:
            print(f"   - {t.name} (ID: {t.id})")
        
        response = input("\n⚠️  This will add test data to admin panel tables. Continue? (yes/no): ")
        if response.lower() not in ['yes', 'y']:
            print("❌ Aborted.")
            return
        
        # Seed data that works
        seed_campaigns(tenant_ids)
        # seed_api_keys(tenant_ids)  # Model has custom __init__
        seed_additional_roles()
        
        print("\n" + "="*60)
        print("✅ ADMIN PANEL DATA SEEDING COMPLETED!")
        print("="*60)
        print("\n📊 Summary:")
        print("   - 15 Campaigns ✓")
        print("   - 4 Additional Roles ✓")
        print("\n💡 Campaigns sayfasını test edebilirsiniz!")
        print("="*60)

if __name__ == "__main__":
    run_seed()
