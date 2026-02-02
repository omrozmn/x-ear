#!/usr/bin/env python3
"""
COMPREHENSIVE SEED DATA - Using actual schema
Creates: parties, appointments, sales, devices, inventory, suppliers
"""
import sys
import os
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.orm import Session
from core.database import get_db
from core.models import (
    Party, Branch, User, Tenant, Appointment,
    Sale, Device, DeviceAssignment, Supplier,
    InventoryItem, Invoice
)
from datetime import datetime, timedelta, time
import random
import uuid

def create_tenant(db: Session) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.slug == "demo-clinic").first()
    if not tenant:
        tenant = Tenant(
            id=str(uuid.uuid4()),
            name="Demo Klinik",
            slug="demo-clinic",
            owner_email="owner@demo.com",
            billing_email="billing@demo.com",
            settings={"locale": "tr"},
            created_at=datetime.utcnow()
        )
        db.add(tenant)
        db.commit()
    return tenant

def create_branches(db: Session, tenant_id: str) -> list:
    branches = []
    for i, (name, city) in enumerate([
        ("Merkez Şube", "İstanbul"),
        ("Ankara Şubesi", "Ankara"),
        ("İzmir Şubesi", "İzmir")
    ]):
        branch = Branch(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            name=name,
            address_city=city,
            created_at=datetime.utcnow()
        )
        db.add(branch)
        branches.append(branch)
    db.commit()
    return branches

def create_users(db: Session, tenant_id: str, branches: list) -> list:
    users = []
    for i, branch in enumerate(branches):
        user = User(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            branch_id=branch.id,
            email=f"user{i+1}@demo.com",
            first_name=f"Kullanıcı {i+1}",
            last_name="Demo",
            role="user",
            is_active=True,
            created_at=datetime.utcnow()
        )
        db.add(user)
        users.append(user)
    db.commit()
    return users

def create_suppliers(db: Session, tenant_id: str) -> list:
    suppliers = []
    for name in ["Phonak Turkey", "Siemens Hearing", "Widex Turkey", "Oticon Turkey"]:
        supplier = Supplier(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            name=name,
            contact_email=f"info@{name.lower().replace(' ', '')}.com",
            is_active=True,
            created_at=datetime.utcnow()
        )
        db.add(supplier)
        suppliers.append(supplier)
    db.commit()
    return suppliers

def create_parties(db: Session, tenant_id: str, branches: list, count=100) -> list:
    first_names = ["Ahmet", "Mehmet", "Ayşe", "Fatma", "Ali", "Zeynep", "Mustafa", "Emine"]
    last_names = ["Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Yıldız", "Aydın", "Özdemir"]
    statuses = ["active", "inactive"]
    segments = ["new", "trial", "customer", "vip"]
    acquisition_types = ["referral", "online", "walk-in", "social-media"]
    
    parties = []
    for i in range(count):
        party = Party(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            branch_id=random.choice(branches).id,
            first_name=random.choice(first_names),
            last_name=random.choice(last_names),
            tc_number=f"{random.randint(10000000000, 99999999999)}",
            phone=f"+90{random.randint(5000000000, 5999999999)}",
            email=f"hasta{i}@demo.com",
            birth_date=datetime(random.randint(1950, 2000), random.randint(1, 12), random.randint(1, 28)),
            gender=random.choice(["male", "female"]),
            status=random.choice(statuses),
            segment=random.choice(segments),
            acquisition_type=random.choice(acquisition_types),
            address_city=random.choice(["İstanbul", "Ankara", "İzmir"]),
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 365))
        )
        db.add(party)
        parties.append(party)
    db.commit()
    return parties

def create_inventory(db: Session, tenant_id: str) -> list:
    items = []
    for name, price, stock in [
        ("Phonak Audeo P90", 12000, 15),
        ("Siemens Pure 7", 10000, 20),
        ("Widex Moment 440", 15000, 10),
        ("Batarya PR44", 50, 200),
        ("Kulak Kalıbı", 300, 50),
    ]:
        item = InventoryItem(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            name=name,
            unit_price=price,
            quantity=stock,
            created_at=datetime.utcnow()
        )
        db.add(item)
        items.append(item)
    db.commit()
    return items

def create_devices(db: Session, tenant_id: str, suppliers: list, count=50) -> list:
    brands = ["Phonak", "Siemens", "Widex", "Oticon"]
    models = ["Audeo P90", "Pure 7", "Moment 440", "Opn S1"]
    
    devices = []
    for i in range(count):
        device = Device(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            serial_number=f"SN{random.randint(100000, 999999)}",
            brand=random.choice(brands),
            model=random.choice(models),
            device_type="hearing_aid",
            status="in_stock",
            purchase_price=random.randint(8000, 15000),
            created_at=datetime.utcnow()
        )
        db.add(device)
        devices.append(device)
    db.commit()
    return devices

def create_appointments(db: Session, tenant_id: str, parties: list, branches: list, users: list, count=150):
    types = ["consultation", "fitting", "repair", "checkup"]
    statuses = ["scheduled", "completed", "cancelled"]
    
    for i in range(count):
        days_offset = random.randint(-90, 30)
        apt_date = datetime.utcnow() + timedelta(days=days_offset)
        
        appointment = Appointment(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            party_id=random.choice(parties).id,
            branch_id=random.choice(branches).id,
            scheduled_at=apt_date,
            duration_minutes=random.choice([30, 60]),
            status=random.choice(statuses  if days_offset < 0 else ["scheduled"]),
            notes=f"Randevu {i+1}",
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 100))
        )
        db.add(appointment)
    db.commit()

def create_sales(db: Session, tenant_id: str, parties: list, devices: list, branches: list, count=50):
    for i in range(count):
        party = random.choice(parties)
        device = random.choice(devices)
        sale_date = datetime.utcnow() - timedelta(days=random.randint(1, 180))
        
        sale = Sale(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            party_id=party.id,
            branch_id=random.choice(branches).id,
            total_amount=random.randint(10000, 20000),
            payment_status="paid" if random.random() > 0.3 else "pending",
            sale_date=sale_date,
            created_at=sale_date
        )
        db.add(sale)
        db.flush()
        
        # Create device assignment
        assignment = DeviceAssignment(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            party_id=party.id,
            device_id=device.id,
            sale_id=sale.id,
            assigned_date=sale_date,
            delivery_status="delivered",
            ear_side=random.choice(["left", "right"]),
            created_at=sale_date
        )
        db.add(assignment)
        
        # Create invoice
        invoice = Invoice(
            id=random.randint(10000, 99999),
            tenant_id=tenant_id,
            sale_id=sale.id,
            party_id=party.id,
            device_id=device.id,
            branch_id=sale.branch_id,
            invoice_number=f"INV-2026-{i+1:05d}",
            device_name=f"{device.brand} {device.model}",
            device_serial=device.serial_number,
            device_price=sale.total_amount,
            patient_name=f"{party.first_name} {party.last_name}",
            status="active",
            created_at=sale_date
        )
        db.add(invoice)
    
    db.commit()

def main():
    print("=" * 60)
    print("🌱 COMPREHENSIVE SEED DATA")
    print("=" * 60)
    
    db = next(get_db())
    
    try:
        tenant = create_tenant(db)
        print(f"✅ Tenant: {tenant.name}")
        
        branches = create_branches(db, tenant.id)
        print(f"✅ Created {len(branches)} branches")
        
        users = create_users(db, tenant.id, branches)
        print(f"✅ Created {len(users)} users")
        
        suppliers = create_suppliers(db, tenant.id)
        print(f"✅ Created {len(suppliers)} suppliers")
        
        parties = create_parties(db, tenant.id, branches, 100)
        print(f"✅ Created {len(parties)} parties")
        
        inventory = create_inventory(db, tenant.id)
        print(f"✅ Created {len(inventory)} inventory items")
        
        devices = create_devices(db, tenant.id, suppliers, 50)
        print(f"✅ Created {len(devices)} devices")
        
        create_appointments(db, tenant.id, parties, branches, users, 150)
        print(f"✅ Created 150 appointments")
        
        create_sales(db, tenant.id, parties, devices, branches, 50)
        print(f"✅ Created 50 sales with invoices")
        
        print()
        print("=" * 60)
        print("✅ COMPLETE!")
        print("=" * 60)
        print(f"\n🎯 Tenant ID: {tenant.id}")
        print(f"📧 Login: user1@demo.com, user2@demo.com, user3@demo.com")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return 1
    finally:
        db.close()
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
