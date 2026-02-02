#!/usr/bin/env python3
"""
Comprehensive seed data script for testing party filters and features
Creates diverse test data including parties, branches, users, and more
"""
import sys
import os
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.orm import Session
from core.database import get_db
from core.models import (
    Party, Branch, User, Tenant,
    Invoice, Device, DeviceAssignment, Supplier
)
from datetime import datetime, timedelta
import random

def create_test_tenant(db: Session) -> Tenant:
    """Create or get test tenant"""
    tenant = db.query(Tenant).filter(Tenant.id == "test_tenant").first()
    if not tenant:
        tenant = Tenant(
            id="test_tenant",
            name="Test Klinik",
            slug="test-klinik",
            settings_json={"locale": "tr"},
            created_at=datetime.utcnow()
        )
        db.add(tenant)
        db.commit()
        print(f"✅ Created tenant: {tenant.name}")
    else:
        print(f"⏭️  Tenant already exists: {tenant.name}")
    return tenant

def create_test_branches(db: Session, tenant_id: str) -> list[Branch]:
    """Create test branches"""
    branches_data = [
        {"id": "branch_istanbul", "name": "İstanbul Şubesi", "city": "İstanbul"},
        {"id": "branch_ankara", "name": "Ankara Şubesi", "city": "Ankara"},
        {"id": "branch_izmir", "name": "İzmir Şubesi", "city": "İzmir"},
    ]
    
    branches = []
    for data in branches_data:
        branch = db.query(Branch).filter(Branch.id == data["id"]).first()
        if not branch:
            branch = Branch(
                id=data["id"],
                tenant_id=tenant_id,
                name=data["name"],
                address_city=data["city"],
                created_at=datetime.utcnow()
            )
            db.add(branch)
            branches.append(branch)
            print(f"✅ Created branch: {branch.name}")
        else:
            branches.append(branch)
            print(f"⏭️  Branch already exists: {branch.name}")
    
    db.commit()
    return branches

def create_test_users(db: Session, tenant_id: str, branches: list[Branch]) -> list[User]:
    """Create test users"""
    users_data = [
        {"email": "admin@test.com", "name": "Admin User", "role": "admin"},
        {"email": "user1@test.com", "name": "User 1", "role": "user"},
        {"email": "user2@test.com", "name": "User 2", "role": "user"},
    ]
    
    users = []
    for idx, data in enumerate(users_data):
        user = db.query(User).filter(User.email == data["email"]).first()
        if not user:
            user = User(
                email=data["email"],
                first_name=data["name"].split()[0],
                last_name=data["name"].split()[1] if len(data["name"].split()) > 1 else "User",
                role=data["role"],
                tenant_id=tenant_id,
                branch_id=branches[idx % len(branches)].id if branches else None,
                is_active=True,
                created_at=datetime.utcnow()
            )
            db.add(user)
            users.append(user)
            print(f"✅ Created user: {user.email}")
        else:
            users.append(user)
            print(f"⏭️  User already exists: {user.email}")
    
    db.commit()
    return users

def create_test_parties(db: Session, tenant_id: str, branches: list[Branch]) -> list[Party]:
    """Create comprehensive test parties with diverse data"""
    
    # Test data combinations
    first_names = ["Ahmet", "Mehmet", "Ayşe", "Fatma", "Ali", "Zeynep", "Mustafa", "Emine", "Hüseyin", "Hatice"]
    last_names = ["Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Yıldız", "Aydın", "Özdemir", "Arslan", "Doğan"]
    statuses = ["active", "inactive", "trial"]
    segments = ["new", "trial", "customer", "vip", "renewal"]
    acquisition_types = ["referral", "online", "walk-in", "social-media", "advertisement"]
    
    parties = []
    
    # Create 50 diverse test parties
    for i in range(50):
        party_data = {
            "id": f"test_party_{i:03d}",
            "tenant_id": tenant_id,
            "first_name": random.choice(first_names),
            "last_name": random.choice(last_names),
            "tc_number": f"{random.randint(10000000000, 99999999999)}",
            "phone": f"+90{random.randint(5000000000, 5999999999)}",
            "email": f"test{i}@example.com",
            "birth_date": datetime.utcnow() - timedelta(days=random.randint(7300, 25550)),  # 20-70 years old
            "gender": random.choice(["male", "female"]),
            "status": random.choice(statuses),
            "segment": random.choice(segments),
            "acquisition_type": random.choice(acquisition_types),
            "branch_id": random.choice(branches).id if branches else None,
            "address_city": random.choice(["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya"]),
            "address_district": random.choice(["Kadıköy", "Beşiktaş", "Çankaya", "Konak", "Nilüfer"]),
            "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 365)),
        }
        
        # Check if party exists
        party = db.query(Party).filter(Party.id == party_data["id"]).first()
        if not party:
            party = Party(**party_data)
            db.add(party)
            parties.append(party)
        else:
            parties.append(party)
    
    db.commit()
    print(f"✅ Created/verified {len(parties)} test parties")
    
    # Print distribution
    print("\n📊 Party Distribution:")
    print(f"  Statuses: {dict((s, len([p for p in parties if p.status == s])) for s in set(statuses))}")
    print(f"  Segments: {dict((s, len([p for p in parties if p.segment == s])) for s in set(segments))}")
    print(f"  Acquisition Types: {dict((a, len([p for p in parties if p.acquisition_type == a])) for a in set(acquisition_types))}")
    
    return parties

def create_test_suppliers(db: Session, tenant_id: str) -> list[Supplier]:
    """Create test suppliers"""
    suppliers_data = [
        {"name": "Phonak Turkey", "contact": "info@phonak.com.tr"},
        {"name": "Siemens Hearing", "contact": "info@siemens.com.tr"},
        {"name": "Widex Turkey", "contact": "info@widex.com.tr"},
    ]
    
    suppliers = []
    for data in suppliers_data:
        supplier = db.query(Supplier).filter(
            Supplier.name == data["name"],
            Supplier.tenant_id == tenant_id
        ).first()
        
        if not supplier:
            supplier = Supplier(
                tenant_id=tenant_id,
                name=data["name"],
                contact_email=data["contact"],
                is_active=True,
                created_at=datetime.utcnow()
            )
            db.add(supplier)
            suppliers.append(supplier)
            print(f"✅ Created supplier: {supplier.name}")
        else:
            suppliers.append(supplier)
            print(f"⏭️  Supplier already exists: {supplier.name}")
    
    db.commit()
    return suppliers

def create_test_devices(db: Session, tenant_id: str, parties: list[Party], suppliers: list[Supplier]) -> list[Device]:
    """Create test devices"""
    devices = []
    
    # Create 20 devices
    brands = ["Phonak", "Siemens", "Widex", "Oticon", "Starkey"]
    models = ["Audeo P90", "Pure 7", "Moment 440", "Opn S1", "Livio AI"]
    
    for i in range(20):
        device = db.query(Device).filter(Device.id == f"test_device_{i:03d}").first()
        if not device:
            device = Device(
                id=f"test_device_{i:03d}",
                tenant_id=tenant_id,
                serial_number=f"SN{random.randint(100000, 999999)}",
                brand=random.choice(brands),
                model=random.choice(models),
                device_type="hearing_aid",
                status="in_stock",
                supplier_id=random.choice(suppliers).id if suppliers else None,
                purchase_price=random.randint(5000, 15000),
                created_at=datetime.utcnow()
            )
            db.add(device)
            devices.append(device)
        else:
            devices.append(device)
    
    db.commit()
    print(f"✅ Created/verified {len(devices)} test devices")
    
    # Assign some devices to parties
    assigned = 0
    for i, party in enumerate(random.sample(parties, min(10, len(parties)))):
        if i < len(devices):
            assignment = db.query(DeviceAssignment).filter(
                DeviceAssignment.device_id == devices[i].id,
                DeviceAssignment.party_id == party.id
            ).first()
            
            if not assignment:
                assignment = DeviceAssignment(
                    device_id=devices[i].id,
                    party_id=party.id,
                    tenant_id=tenant_id,
                    assigned_date=datetime.utcnow(),
                    delivery_status="delivered",
                    ear_side=random.choice(["left", "right"]),
                    created_at=datetime.utcnow()
                )
                db.add(assignment)
                assigned += 1
    
    db.commit()
    print(f"✅ Assigned {assigned} devices to parties")
    
    return devices

def main():
    """Main seed function"""
    print("🌱 Starting comprehensive seed data creation...\n")
    
    db = next(get_db())
    
    try:
        # Create tenant
        tenant = create_test_tenant(db)
        
        # Create branches
        branches = create_test_branches(db, tenant.id)
        
        # Create users
        users = create_test_users(db, tenant.id, branches)
        
        # Create parties
        parties = create_test_parties(db, tenant.id, branches)
        
        # Create suppliers
        suppliers = create_test_suppliers(db, tenant.id)
        
        # Create devices
        devices = create_test_devices(db, tenant.id, parties, suppliers)
        
        print("\n✅ Seed data creation completed successfully!")
        print(f"\nCreated:")
        print(f"  • 1 Tenant")
        print(f"  • {len(branches)} Branches")
        print(f"  • {len(users)} Users")
        print(f"  • {len(parties)} Parties")
        print(f"  • {len(suppliers)} Suppliers")
        print(f"  • {len(devices)} Devices")
        
    except Exception as e:
        print(f"\n❌ Error creating seed data: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
