#!/usr/bin/env python3
"""
Comprehensive Test Data Seeding Script for E2E Tests

This script creates a complete test dataset including:
- User accounts (different roles)
- Parties (customers/patients)
- Devices (inventory)
- Branches
- System settings

Usage:
    python scripts/seed_comprehensive_data.py

Environment:
    DATABASE_URL: PostgreSQL connection string (default: test database)
    TEST_MODE: Set to 'true' to use test database
"""

import os
import sys
from datetime import datetime
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.models import Base, User, Party, InventoryItem, Branch, SystemSetting
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ DATABASE_URL environment variable not set!")
    print("Using SQLite fallback...")
    DATABASE_URL = "sqlite:///./instance/xear_crm.db"

print(f"🔧 Using database: {DATABASE_URL}")

# Create engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def hash_password(password: str) -> str:
    """Hash a password for storing."""
    return pwd_context.hash(password)

def create_users(db):
    """Create test user accounts with different roles."""
    print("\n👥 Creating users...")
    
    users_data = [
        {
            "email": "admin@xear.com",
            "username": "admin",
            "password": "Admin123!",
            "first_name": "Admin",
            "last_name": "User",
            "role": "ADMIN",
            "is_active": True,
            "tenant_id": "tenant_001"
        },
        {
            "email": "audiologist@xear.com",
            "username": "audiologist",
            "password": "Audio123!",
            "first_name": "Ayşe",
            "last_name": "Yılmaz",
            "role": "AUDIOLOGIST",
            "is_active": True,
            "tenant_id": "tenant_001"
        },
        {
            "email": "receptionist@xear.com",
            "username": "receptionist",
            "password": "Recep123!",
            "first_name": "Mehmet",
            "last_name": "Demir",
            "role": "RECEPTIONIST",
            "is_active": True,
            "tenant_id": "tenant_001"
        },
        {
            "email": "sales@xear.com",
            "username": "sales",
            "password": "Sales123!",
            "first_name": "Fatma",
            "last_name": "Kaya",
            "role": "SALES",
            "is_active": True,
            "tenant_id": "tenant_001"
        },
        {
            "email": "support@xear.com",
            "username": "support",
            "password": "Support123!",
            "first_name": "Ali",
            "last_name": "Çelik",
            "role": "SUPPORT",
            "is_active": True,
            "tenant_id": "tenant_001"
        }
    ]
    
    created_users = []
    for user_data in users_data:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data["email"]).first()
        if existing_user:
            print(f"  ⏭️  User {user_data['email']} already exists, skipping...")
            created_users.append(existing_user)
            continue
        
        user = User(
            email=user_data["email"],
            username=user_data["username"],
            password_hash=hash_password(user_data["password"]),
            first_name=user_data["first_name"],
            last_name=user_data["last_name"],
            role=user_data["role"],
            is_active=user_data["is_active"],
            is_phone_verified=True,  # Set phone as verified for test users
            tenant_id=user_data["tenant_id"],
            created_at=datetime.utcnow()
        )
        db.add(user)
        created_users.append(user)
        print(f"  ✅ Created user: {user_data['email']} ({user_data['role']})")
    
    db.commit()
    print(f"✅ Created {len(created_users)} users")
    return created_users

def create_parties(db):
    """Create test parties (customers/patients)."""
    print("\n🏥 Creating parties...")
    
    parties_data = [
        # Customers with full data
        {
            "first_name": "Ahmet",
            "last_name": "Yılmaz",
            "phone": "+905551234567",
            "email": "ahmet.yilmaz@example.com",
            "tc_number": "12345678901",
            "gender": "M",
            "birth_date": "1980-05-15",
            "status": "active",
            "segment": "VIP",
            "tenant_id": "tenant_001"
        },
        {
            "first_name": "Ayşe",
            "last_name": "Demir",
            "phone": "+905559876543",
            "email": "ayse.demir@example.com",
            "tc_number": "98765432109",
            "gender": "F",
            "birth_date": "1975-08-22",
            "status": "active",
            "segment": "REGULAR",
            "tenant_id": "tenant_001"
        },
        {
            "first_name": "Mehmet",
            "last_name": "Kaya",
            "phone": "+905551112233",
            "email": "mehmet.kaya@example.com",
            "tc_number": "11122233344",
            "gender": "M",
            "birth_date": "1990-03-10",
            "status": "active",
            "segment": "NEW",
            "tenant_id": "tenant_001"
        },
        {
            "first_name": "Fatma",
            "last_name": "Çelik",
            "phone": "+905554445566",
            "email": "fatma.celik@example.com",
            "tc_number": "55566677788",
            "gender": "F",
            "birth_date": "1985-11-30",
            "status": "active",
            "segment": "REGULAR",
            "tenant_id": "tenant_001"
        },
        {
            "first_name": "Ali",
            "last_name": "Öztürk",
            "phone": "+905557778899",
            "email": "ali.ozturk@example.com",
            "tc_number": "99988877766",
            "gender": "M",
            "birth_date": "1970-01-05",
            "status": "active",
            "segment": "VIP",
            "tenant_id": "tenant_001"
        },
        # Patients with hearing profiles
        {
            "first_name": "Zeynep",
            "last_name": "Arslan",
            "phone": "+905551231234",
            "email": "zeynep.arslan@example.com",
            "tc_number": "12312312312",
            "gender": "F",
            "birth_date": "1995-06-18",
            "status": "active",
            "segment": "PATIENT",
            "tenant_id": "tenant_001"
        },
        {
            "first_name": "Hasan",
            "last_name": "Yıldız",
            "phone": "+905554564567",
            "email": "hasan.yildiz@example.com",
            "tc_number": "45645645645",
            "gender": "M",
            "birth_date": "1960-09-25",
            "status": "active",
            "segment": "PATIENT",
            "tenant_id": "tenant_001"
        },
        {
            "first_name": "Elif",
            "last_name": "Şahin",
            "phone": "+905557897890",
            "email": "elif.sahin@example.com",
            "tc_number": "78978978978",
            "gender": "F",
            "birth_date": "2010-12-12",
            "status": "active",
            "segment": "PATIENT",
            "tenant_id": "tenant_001"
        },
        {
            "first_name": "Mustafa",
            "last_name": "Aydın",
            "phone": "+905553213210",
            "email": "mustafa.aydin@example.com",
            "tc_number": "32132132132",
            "gender": "M",
            "birth_date": "1955-04-08",
            "status": "active",
            "segment": "PATIENT",
            "tenant_id": "tenant_001"
        },
        {
            "first_name": "Selin",
            "last_name": "Koç",
            "phone": "+905556546540",
            "email": "selin.koc@example.com",
            "tc_number": "65465465465",
            "gender": "F",
            "birth_date": "2015-07-20",
            "status": "active",
            "segment": "PATIENT",
            "tenant_id": "tenant_001"
        }
    ]
    
    created_parties = []
    for party_data in parties_data:
        # Check if party already exists
        existing_party = db.query(Party).filter(
            Party.phone == party_data["phone"]
        ).first()
        if existing_party:
            print(f"  ⏭️  Party {party_data['first_name']} {party_data['last_name']} already exists, skipping...")
            created_parties.append(existing_party)
            continue
        
        party = Party(
            first_name=party_data["first_name"],
            last_name=party_data["last_name"],
            phone=party_data["phone"],
            email=party_data.get("email"),
            tc_number=party_data.get("tc_number"),
            gender=party_data.get("gender"),
            birth_date=datetime.strptime(party_data["birth_date"], "%Y-%m-%d").date() if party_data.get("birth_date") else None,
            status=party_data["status"],
            segment=party_data.get("segment"),
            tenant_id=party_data["tenant_id"],
            created_at=datetime.utcnow()
        )
        db.add(party)
        created_parties.append(party)
        print(f"  ✅ Created party: {party_data['first_name']} {party_data['last_name']} ({party_data['segment']})")
    
    db.commit()
    print(f"✅ Created {len(created_parties)} parties")
    return created_parties

def create_devices(db):
    """Create test devices (inventory)."""
    print("\n🎧 Creating devices...")
    
    devices_data = [
        # Hearing aids
        {
            "name": "Phonak Audéo Paradise P90",
            "brand": "Phonak",
            "model": "Audéo Paradise P90",
            "category": "hearing_aid",
            "stock_code": "PH-P90-001",
            "barcode": "7612345678901",
            "price": 45000.00,
            "available_inventory": 5,
            "total_inventory": 5,
            "unit": "adet",
            "tenant_id": "tenant_001"
        },
        {
            "name": "Oticon More 1",
            "brand": "Oticon",
            "model": "More 1",
            "category": "hearing_aid",
            "stock_code": "OT-M1-001",
            "barcode": "7612345678902",
            "price": 42000.00,
            "available_inventory": 3,
            "total_inventory": 3,
            "unit": "adet",
            "tenant_id": "tenant_001"
        },
        {
            "name": "Widex Moment 440",
            "brand": "Widex",
            "model": "Moment 440",
            "category": "hearing_aid",
            "stock_code": "WX-M440-001",
            "barcode": "7612345678903",
            "price": 38000.00,
            "available_inventory": 4,
            "total_inventory": 4,
            "unit": "adet",
            "tenant_id": "tenant_001"
        },
        {
            "name": "Signia Pure Charge&Go 7X",
            "brand": "Signia",
            "model": "Pure Charge&Go 7X",
            "category": "hearing_aid",
            "stock_code": "SG-PCG7X-001",
            "barcode": "7612345678904",
            "price": 40000.00,
            "available_inventory": 2,
            "total_inventory": 2,
            "unit": "adet",
            "tenant_id": "tenant_001"
        },
        {
            "name": "Starkey Livio Edge AI",
            "brand": "Starkey",
            "model": "Livio Edge AI",
            "category": "hearing_aid",
            "stock_code": "ST-LEA-001",
            "barcode": "7612345678905",
            "price": 43000.00,
            "available_inventory": 3,
            "total_inventory": 3,
            "unit": "adet",
            "tenant_id": "tenant_001"
        },
        # Pill packages
        {
            "name": "İşitme Cihazı Pili 312 (104 adet)",
            "brand": "Rayovac",
            "model": "312",
            "category": "battery",
            "stock_code": "RV-312-001",
            "barcode": "7612345678906",
            "price": 150.00,
            "available_inventory": 50,
            "total_inventory": 50,
            "unit": "paket",
            "package_quantity": 104,
            "tenant_id": "tenant_001"
        },
        {
            "name": "İşitme Cihazı Pili 13 (104 adet)",
            "brand": "Rayovac",
            "model": "13",
            "category": "battery",
            "stock_code": "RV-13-001",
            "barcode": "7612345678907",
            "price": 150.00,
            "available_inventory": 40,
            "total_inventory": 40,
            "unit": "paket",
            "package_quantity": 104,
            "tenant_id": "tenant_001"
        },
        {
            "name": "İşitme Cihazı Pili 10 (104 adet)",
            "brand": "Rayovac",
            "model": "10",
            "category": "battery",
            "stock_code": "RV-10-001",
            "barcode": "7612345678908",
            "price": 150.00,
            "available_inventory": 30,
            "total_inventory": 30,
            "unit": "paket",
            "package_quantity": 104,
            "tenant_id": "tenant_001"
        },
        # Accessories
        {
            "name": "Kurutma Kapsülü",
            "brand": "Generic",
            "model": "Drying Capsule",
            "category": "accessory",
            "stock_code": "GEN-DC-001",
            "barcode": "7612345678909",
            "price": 50.00,
            "available_inventory": 100,
            "total_inventory": 100,
            "unit": "adet",
            "tenant_id": "tenant_001"
        },
        {
            "name": "Temizleme Seti",
            "brand": "Generic",
            "model": "Cleaning Kit",
            "category": "accessory",
            "stock_code": "GEN-CK-001",
            "barcode": "7612345678910",
            "price": 75.00,
            "available_inventory": 80,
            "total_inventory": 80,
            "unit": "adet",
            "tenant_id": "tenant_001"
        }
    ]
    
    created_devices = []
    for device_data in devices_data:
        # Check if device already exists
        existing_device = db.query(InventoryItem).filter(
            InventoryItem.stock_code == device_data["stock_code"]
        ).first()
        if existing_device:
            print(f"  ⏭️  Device {device_data['name']} already exists, skipping...")
            created_devices.append(existing_device)
            continue
        
        device = InventoryItem(
            id=f"inv_{device_data['stock_code']}",
            name=device_data["name"],
            brand=device_data["brand"],
            model=device_data["model"],
            category=device_data["category"],
            stock_code=device_data["stock_code"],
            barcode=device_data.get("barcode"),
            price=device_data["price"],
            available_inventory=device_data.get("available_inventory", 0),
            total_inventory=device_data.get("total_inventory", 0),
            unit=device_data["unit"],
            tenant_id=device_data["tenant_id"],
            created_at=datetime.utcnow()
        )
        db.add(device)
        created_devices.append(device)
        print(f"  ✅ Created device: {device_data['name']} ({device_data['category']})")
    
    db.commit()
    print(f"✅ Created {len(created_devices)} devices")
    return created_devices

def create_branches(db):
    """Create test branches."""
    print("\n🏢 Creating branches...")
    
    branches_data = [
        {
            "name": "Ana Şube (İstanbul)",
            "code": "IST-001",
            "address": "Bağdat Caddesi No:123, Kadıköy, İstanbul",
            "phone": "+902161234567",
            "email": "istanbul@xear.com",
            "is_active": True,
            "tenant_id": "tenant_001"
        },
        {
            "name": "Ankara Şubesi",
            "code": "ANK-001",
            "address": "Tunalı Hilmi Caddesi No:45, Çankaya, Ankara",
            "phone": "+903121234567",
            "email": "ankara@xear.com",
            "is_active": True,
            "tenant_id": "tenant_001"
        },
        {
            "name": "İzmir Şubesi",
            "code": "IZM-001",
            "address": "Alsancak Mahallesi, Kıbrıs Şehitleri Caddesi No:78, Konak, İzmir",
            "phone": "+902321234567",
            "email": "izmir@xear.com",
            "is_active": True,
            "tenant_id": "tenant_001"
        }
    ]
    
    created_branches = []
    for branch_data in branches_data:
        # Check if branch already exists
        existing_branch = db.query(Branch).filter(
            Branch.code == branch_data["code"]
        ).first()
        if existing_branch:
            print(f"  ⏭️  Branch {branch_data['name']} already exists, skipping...")
            created_branches.append(existing_branch)
            continue
        
        branch = Branch(
            name=branch_data["name"],
            code=branch_data["code"],
            address=branch_data["address"],
            phone=branch_data["phone"],
            email=branch_data.get("email"),
            is_active=branch_data["is_active"],
            tenant_id=branch_data["tenant_id"],
            created_at=datetime.utcnow()
        )
        db.add(branch)
        created_branches.append(branch)
        print(f"  ✅ Created branch: {branch_data['name']}")
    
    db.commit()
    print(f"✅ Created {len(created_branches)} branches")
    return created_branches

def create_system_settings(db):
    """Create system settings."""
    print("\n⚙️  Creating system settings...")
    
    settings_data = [
        {
            "key": "sgk_enabled",
            "value": "true",
            "category": "sgk",
            "description": "SGK entegrasyonu aktif mi?"
        },
        {
            "key": "sgk_pill_price",
            "value": "698",
            "category": "sgk",
            "description": "104 adet pil için SGK ödemesi (TL)"
        },
        {
            "key": "sgk_validity_years",
            "value": "5",
            "category": "sgk",
            "description": "İşitme cihazı SGK rapor geçerlilik süresi (yıl)"
        },
        {
            "key": "einvoice_enabled",
            "value": "true",
            "category": "einvoice",
            "description": "E-fatura entegrasyonu aktif mi?"
        },
        {
            "key": "sms_enabled",
            "value": "true",
            "category": "sms",
            "description": "SMS gönderimi aktif mi?"
        },
        {
            "key": "sms_credits",
            "value": "1000",
            "category": "sms",
            "description": "Kalan SMS kredisi"
        },
        {
            "key": "email_enabled",
            "value": "true",
            "category": "email",
            "description": "Email gönderimi aktif mi?"
        }
    ]
    
    created_settings = []
    for setting_data in settings_data:
        # Check if setting already exists (SystemSetting uses key as primary key, no tenant_id)
        existing_setting = db.query(SystemSetting).filter(
            SystemSetting.key == setting_data["key"]
        ).first()
        if existing_setting:
            print(f"  ⏭️  Setting {setting_data['key']} already exists, skipping...")
            created_settings.append(existing_setting)
            continue
        
        setting = SystemSetting(
            key=setting_data["key"],
            value=setting_data["value"],
            category=setting_data["category"],
            description=setting_data.get("description")
        )
        db.add(setting)
        created_settings.append(setting)
        print(f"  ✅ Created setting: {setting_data['key']} = {setting_data['value']}")
    
    db.commit()
    print(f"✅ Created {len(created_settings)} system settings")
    return created_settings

def main():
    """Main seeding function."""
    print("=" * 60)
    print("🌱 X-Ear CRM - Comprehensive Test Data Seeding")
    print("=" * 60)
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Create all tables
        print("\n📦 Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created")
        
        # Seed data
        users = create_users(db)
        parties = create_parties(db)
        devices = create_devices(db)
        # branches = create_branches(db)  # Skip for now
        settings = create_system_settings(db)
        
        # Summary
        print("\n" + "=" * 60)
        print("✅ SEEDING COMPLETE!")
        print("=" * 60)
        print(f"👥 Users: {len(users)}")
        print(f"🏥 Parties: {len(parties)}")
        print(f"🎧 Devices: {len(devices)}")
        # print(f"🏢 Branches: {len(branches)}")
        print(f"⚙️  Settings: {len(settings)}")
        print("=" * 60)
        
        print("\n📝 Test Credentials:")
        print("-" * 60)
        print("Admin:        admin@xear.com / Admin123!")
        print("Audiologist:  audiologist@xear.com / Audio123!")
        print("Receptionist: receptionist@xear.com / Recep123!")
        print("Sales:        sales@xear.com / Sales123!")
        print("Support:      support@xear.com / Support123!")
        print("-" * 60)
        
    except Exception as e:
        print(f"\n❌ Error during seeding: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()
