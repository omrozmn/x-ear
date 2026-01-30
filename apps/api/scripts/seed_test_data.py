#!/usr/bin/env python3
"""
Seed test data for critical flow E2E tests.

This script creates:
- Test tenant with active subscription
- Test user with TENANT_ADMIN role
- Sample inventory items (hearing aids)
- Sample branches
- Sample parties (for read-only tests)
"""

import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.models import (
    Tenant, User, Party, Role, Branch,
    HearingProfile, Base
)
from core.models.inventory import InventoryItem
from werkzeug.security import generate_password_hash
import uuid


def seed_test_data():
    """Seed test data for E2E tests."""
    
    # Get database URL from environment - default to SQLite for local dev
    database_url = os.getenv('DATABASE_URL')
    
    # If DATABASE_URL points to PostgreSQL but we're in local dev, use SQLite
    if not database_url or 'postgresql' in database_url:
        # Use SQLite for local development
        db_path = Path(__file__).parent.parent / 'instance' / 'xear_crm.db'
        database_url = f'sqlite:///{db_path}'
    
    print(f"🌱 Seeding test data to: {database_url}")
    
    # Create engine and session
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Create test tenant
        tenant_id = "tenant_test_e2e_001"
        tenant = db.query(Tenant).filter_by(id=tenant_id).first()
        
        if not tenant:
            tenant = Tenant(
                id=tenant_id,
                name="E2E Test Clinic",
                slug="e2e-test-clinic",
                owner_email="owner@e2e-test.com",
                billing_email="billing@e2e-test.com",
                current_plan="PRO",
                status="active",
                subscription_start_date=datetime.utcnow(),
                subscription_end_date=datetime.utcnow() + timedelta(days=365),
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(tenant)
            print(f"✅ Created test tenant: {tenant_id}")
        else:
            print(f"ℹ️  Test tenant already exists: {tenant_id}")
        
        # Create test user
        test_user_phone = "+905551234567"
        user = db.query(User).filter_by(phone=test_user_phone).first()
        
        if not user:
            user = User(
                id=str(uuid.uuid4()),
                tenant_id=tenant_id,
                username=test_user_phone,
                phone=test_user_phone,
                email="test@e2e.example.com",
                first_name="Test",
                last_name="User",
                password_hash=generate_password_hash("password123", method='pbkdf2:sha256'),
                is_active=True,
                is_phone_verified=True,
                created_at=datetime.utcnow()
            )
            db.add(user)
            print(f"✅ Created test user: {test_user_phone}")
        else:
            print(f"ℹ️  Test user already exists: {test_user_phone}")
        
        # Assign TENANT_ADMIN role
        role = db.query(Role).filter_by(
            user_id=user.id,
            role_code="TENANT_ADMIN"
        ).first()
        
        if not role:
            role = Role(
                id=str(uuid.uuid4()),
                user_id=user.id,
                tenant_id=tenant_id,
                role_code="TENANT_ADMIN",
                assigned_at=datetime.utcnow()
            )
            db.add(role)
            print(f"✅ Assigned TENANT_ADMIN role to test user")
        
        # Create sample branches
        branch_names = ["Ana Şube", "Kadıköy Şubesi"]
        for branch_name in branch_names:
            branch = db.query(Branch).filter_by(
                tenant_id=tenant_id,
                name=branch_name
            ).first()
            
            if not branch:
                branch = Branch(
                    id=str(uuid.uuid4()),
                    tenant_id=tenant_id,
                    name=branch_name,
                    address=f"{branch_name} Adresi",
                    phone="+902161234567",
                    is_active=True,
                    created_at=datetime.utcnow()
                )
                db.add(branch)
                print(f"✅ Created branch: {branch_name}")
        
        # Create sample inventory items (hearing aids)
        hearing_aids = [
            {"brand": "Phonak", "model": "Audeo Paradise P90", "price": 25000},
            {"brand": "Oticon", "model": "More 1", "price": 28000},
            {"brand": "Widex", "model": "Moment 440", "price": 30000},
            {"brand": "Signia", "model": "Pure Charge&Go 7X", "price": 27000},
            {"brand": "Starkey", "model": "Livio Edge AI", "price": 26000},
        ]
        
        for aid in hearing_aids:
            inventory = db.query(InventoryItem).filter_by(
                tenant_id=tenant_id,
                brand=aid["brand"],
                model=aid["model"]
            ).first()
            
            if not inventory:
                inventory = InventoryItem(
                    id=str(uuid.uuid4()),
                    tenant_id=tenant_id,
                    name=f"{aid['brand']} {aid['model']}",
                    brand=aid["brand"],
                    model=aid["model"],
                    category="hearing_aid",
                    barcode=f"HA{aid['brand'][:3].upper()}{aid['model'][:3].upper()}",
                    list_price=aid["price"],
                    stock_quantity=10,
                    is_active=True,
                    created_at=datetime.utcnow()
                )
                db.add(inventory)
                print(f"✅ Created inventory: {aid['brand']} {aid['model']}")
        
        # Create sample parties (for read-only tests)
        sample_parties = [
            {"firstName": "Ahmet", "lastName": "Yılmaz", "phone": "+905551111111"},
            {"firstName": "Ayşe", "lastName": "Demir", "phone": "+905552222222"},
            {"firstName": "Mehmet", "lastName": "Kaya", "phone": "+905553333333"},
        ]
        
        for party_data in sample_parties:
            party = db.query(Party).filter_by(
                tenant_id=tenant_id,
                phone=party_data["phone"]
            ).first()
            
            if not party:
                party = Party(
                    id=str(uuid.uuid4()),
                    tenant_id=tenant_id,
                    first_name=party_data["firstName"],
                    last_name=party_data["lastName"],
                    phone=party_data["phone"],
                    email=f"{party_data['firstName'].lower()}@example.com",
                    is_active=True,
                    created_at=datetime.utcnow()
                )
                db.add(party)
                print(f"✅ Created sample party: {party_data['firstName']} {party_data['lastName']}")
        
        # Commit all changes
        db.commit()
        print("\n🎉 Test data seeding completed successfully!")
        
        # Print summary
        print("\n📊 Summary:")
        print(f"   Tenant ID: {tenant_id}")
        print(f"   Test User: {test_user_phone}")
        print(f"   Password: password123")
        print(f"   Branches: {len(branch_names)}")
        print(f"   Inventory Items: {len(hearing_aids)}")
        print(f"   Sample Parties: {len(sample_parties)}")
        
    except Exception as e:
        print(f"\n❌ Error seeding test data: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_test_data()
