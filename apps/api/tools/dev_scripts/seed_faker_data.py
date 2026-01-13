import sys
import os
# Add backend root to path to allow imports from app, models, etc.
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

import sys
import os
import random
from datetime import datetime, timedelta, timezone
from faker import Faker
import json
import uuid

# Add app context
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app import app
from models.base import db, gen_id
from models.user import User
from models.tenant import Tenant
from models.permission import Permission as PermissionModel 
from models.role import Role
from models.patient import Patient
from models.inventory import InventoryItem 
from models.suppliers import Supplier
from models.sales import Sale
from models.appointment import Appointment
from models.branch import Branch
from models.enums import PatientStatus
from utils.tenant_security import _skip_filter

fake = Faker('tr_TR')
Faker.seed(42)  # Reproducible data

def get_all_permissions_from_map():
    from config.permissions_map import ENDPOINT_PERMISSIONS
    perms = set()
    for key, val in ENDPOINT_PERMISSIONS.items():
        if val and val != 'public':
            perms.add(val)
    return sorted(list(perms))

def ensure_permissions():
    print("--- 1. Ensuring Permissions & Roles ---")
    all_perms_names = get_all_permissions_from_map()
    
    # 1. Ensure all Permissions exist in DB
    existing_perms = {p.name: p for p in PermissionModel.query.all()}
    for p_name in all_perms_names:
        if p_name not in existing_perms:
            description = p_name.replace('.', ' ').capitalize()
            new_perm = PermissionModel(name=p_name, description=description)
            db.session.add(new_perm)
            existing_perms[p_name] = new_perm
    db.session.commit()
    print(f"Verified {len(existing_perms)} permissions.")

    # 2. Update tenant_admin role
    tenant_admin = Role.query.filter_by(name='tenant_admin').first()
    if not tenant_admin:
        tenant_admin = Role(name='tenant_admin', description='Tenant Administrator')
        db.session.add(tenant_admin)
    
    # Grant permissions
    tenant_admin.permissions = []
    for p_name, p_obj in existing_perms.items():
        tenant_admin.permissions.append(p_obj)
        
    db.session.commit()
    print("Updated 'tenant_admin' role with all permissions.")

def seed_data(tenant_id):
    print(f"\n--- 2. Seeding Data for Tenant {tenant_id} ---")
    
    # 1. Branches
    branches = []
    branch_names = ["Merkez Şube", "Kadıköy Şubesi", "Beşiktaş Şubesi"]
    for name in branch_names:
        b = Branch(
            tenant_id=tenant_id,
            name=name,
            address=fake.address(),
            phone=fake.phone_number(),
            email=fake.email()
        )
        db.session.add(b)
        branches.append(b)
    db.session.flush()
    print(f"Seeded {len(branches)} Branches")
    
    # 2. Suppliers
    suppliers = []
    supplier_companies = ["Medikal Tedarik A.Ş.", "Sağlık Ekipman Ltd.", "Hearing Tech", "AudioCare", "MediSupply"]
    for company in supplier_companies:
        s = Supplier(
            tenant_id=tenant_id,
            company_name=company,
            contact_person=fake.name(),
            email=fake.email(),
            phone=fake.phone_number(),
            address=fake.address(),
            tax_number=str(fake.random_number(digits=10)),
            tax_office=fake.city(),
            is_active=True
        )
        db.session.add(s)
        suppliers.append(s)
    db.session.flush()
    print(f"Seeded {len(suppliers)} Suppliers")

    # 3. Inventory (InventoryItem)
    brands = ["Oticon", "Phonak", "Starkey", "Widex", "Signia", "ReSound", "Unitron"]
    cats = ["hearing_aid", "battery", "accessory", "ear_mold", "cleaning_supplies"]
    
    items = []
    for i in range(50):  # 50 adet ürün
        brand_name = random.choice(brands)
        cat_name = random.choice(cats)
        
        # Create unique ID
        item_id = f"item_{uuid.uuid4().hex[:8]}"
        
        # Generate serials for hearing aids
        serials = []
        stock_qty = random.randint(5, 30)
        if cat_name == "hearing_aid":
            for _ in range(stock_qty):
                serials.append(fake.bothify(text='SN-########'))

        price = round(random.uniform(500, 25000), 2)
        cost = round(price * random.uniform(0.5, 0.7), 2)
        
        item = InventoryItem(
            id=item_id,
            tenant_id=tenant_id,
            name=f"{brand_name} {fake.word().capitalize()} {random.randint(100, 999)}",
            brand=brand_name,
            model=fake.bothify(text='??-####'),
            category=cat_name,
            barcode=fake.ean13(),
            stock_code=f"STK-{uuid.uuid4().hex[:6].upper()}",
            supplier=random.choice(suppliers).company_name,
            unit='adet',
            description=fake.sentence(),
            available_inventory=len(serials) if serials else stock_qty,
            total_inventory=len(serials) if serials else stock_qty,
            used_inventory=0,
            reorder_level=5,
            price=price,
            cost=cost,
            kdv_rate=10.0 if cat_name == 'hearing_aid' else 20.0,
            available_serials=json.dumps(serials) if serials else None
        )
        db.session.add(item)
        items.append(item)
        
    db.session.flush()
    print(f"Seeded {len(items)} Inventory Items")

    # 4. Patients
    patients = []
    for i in range(100):  # 100 hasta
        birth_date = fake.date_of_birth(minimum_age=18, maximum_age=85)
        p = Patient(
            tenant_id=tenant_id,
            first_name=fake.first_name(),
            last_name=fake.last_name(),
            tc_number=str(fake.random_number(digits=11, fix_len=True)),
            phone=fake.phone_number(),
            email=fake.email() if random.random() > 0.3 else None,
            birth_date=birth_date,
            gender=random.choice(['M', 'F']),
            address_full=fake.address(),
            address_city=fake.city(),
            address_district=fake.street_name(),
            status=random.choice([PatientStatus.ACTIVE, PatientStatus.LEAD, PatientStatus.CUSTOMER]),
            acquisition_type=random.choice(['referral', 'walk-in', 'online', 'campaign'])
        )
        db.session.add(p)
        patients.append(p)
    db.session.flush()
    print(f"Seeded {len(patients)} Patients")

    # 5. Appointments (Gelecek ve geçmiş)
    appointments = []
    for _ in range(80):
        patient = random.choice(patients)
        branch = random.choice(branches)
        
        # Yarısı geçmiş, yarısı gelecek
        if random.random() > 0.5:
            appointment_date = fake.date_time_between(start_date='-60d', end_date='now', tzinfo=timezone.utc)
            status = random.choice(['completed', 'no_show', 'cancelled'])
        else:
            appointment_date = fake.date_time_between(start_date='now', end_date='+30d', tzinfo=timezone.utc)
            status = random.choice(['scheduled', 'confirmed'])
        
        appt = Appointment(
            tenant_id=tenant_id,
            patient_id=patient.id,
            branch_id=branch.id if random.random() > 0.2 else None,
            date=appointment_date,
            time=appointment_date.strftime('%H:%M'),
            appointment_type=random.choice(['consultation', 'fitting', 'checkup', 'repair', 'follow_up']),
            status=status,
            notes=fake.sentence() if random.random() > 0.5 else None,
            duration=random.choice([30, 45, 60])
        )
        db.session.add(appt)
        appointments.append(appt)
    db.session.flush()
    print(f"Seeded {len(appointments)} Appointments")

    # 6. Sales (Son 90 gün)
    sales = []
    for _ in range(60):
        patient = random.choice(patients)
        branch = random.choice(branches) if random.random() > 0.3 else None
        
        # Son 90 gün içinde satış
        sale_date = fake.date_time_between(start_date='-90d', end_date='now', tzinfo=timezone.utc)
        
        # 1-3 adet ürün seç
        num_items = random.randint(1, 3)
        selected_items = random.sample(items, min(num_items, len(items)))
        
        total_amount = 0
        total_cost = 0
        sale_items_data = []
        
        for item in selected_items:
            quantity = 1 if item.category == 'hearing_aid' else random.randint(1, 5)
            unit_price = item.price
            total_price = unit_price * quantity
            
            total_amount += total_price
            total_cost += (item.cost * quantity)
            
            sale_items_data.append({
                'inventory_id': item.id,
                'item_name': item.name,
                'quantity': quantity,
                'unit_price': unit_price,
                'total_price': total_price,
                'kdv_rate': item.kdv_rate
            })
        
        # KDV hesapla
        kdv_amount = round(total_amount * 0.1, 2)  # Ortalama %10
        
        # Peşinat
        down_payment = round(total_amount * random.uniform(0.2, 0.5), 2) if random.random() > 0.4 else 0
        remaining_amount = total_amount - down_payment
        
        sale = Sale(
            id=gen_id("sale"),
            tenant_id=tenant_id,
            patient_id=patient.id,
            branch_id=branch.id if branch else None,
            sale_date=sale_date,
            list_price_total=total_amount,
            total_amount=total_amount,
            discount_amount=round(random.uniform(0, total_amount * 0.1), 2) if random.random() > 0.7 else 0,
            final_amount=total_amount - (round(random.uniform(0, total_amount * 0.1), 2) if random.random() > 0.7 else 0),
            paid_amount=down_payment,
            status=random.choice(['completed', 'pending', 'cancelled']),
            payment_method=random.choice(['cash', 'card', 'installment', 'insurance']),
            patient_payment=total_amount - down_payment,
            notes=fake.sentence() if random.random() > 0.6 else None
        )
        db.session.add(sale)
        sales.append(sale)
    
    db.session.flush()
    print(f"Seeded {len(sales)} Sales")

    db.session.commit()
    print("\n✅ Data seeding complete!")

def run_seed():
    with app.app_context():
        _skip_filter.set(True)
        
        print("="*60)
        print("🌱 X-EAR CRM - FAKER DATA SEEDING")
        print("="*60)
        
        # Ensure Roles/Permissions first
        ensure_permissions()
        
        # Find admin@x-ear.com user and their tenant
        admin_user = User.query.filter_by(email="admin@x-ear.com").first()
        if not admin_user:
            print("❌ admin@x-ear.com user not found!")
            print("Run seed_admin.py first to create admin user.")
            return
        
        tenant = Tenant.query.get(admin_user.tenant_id)
        if not tenant:
            print(f"❌ Tenant not found for admin user!")
            return
        
        print(f"\n📋 Target Info:")
        print(f"   User: {admin_user.email}")
        print(f"   Tenant: {tenant.name} (ID: {tenant.id})")
        print(f"   Slug: {tenant.slug}")
        
        # Confirm before seeding
        response = input("\n⚠️  This will add test data. Continue? (yes/no): ")
        if response.lower() not in ['yes', 'y']:
            print("❌ Aborted.")
            return
        
        # Seed data
        seed_data(tenant.id)
        
        print("\n" + "="*60)
        print("✅ SEEDING COMPLETED SUCCESSFULLY!")
        print("="*60)
        print(f"\n📊 Summary:")
        print(f"   - 3 Branches")
        print(f"   - 5 Suppliers")
        print(f"   - 50 Inventory Items")
        print(f"   - 100 Patients")
        print(f"   - 80 Appointments")
        print(f"   - 60 Sales")
        print(f"\n🚀 You can now login and test the system!")
        print(f"   Email: admin@x-ear.com")
        print(f"   Password: (your admin password)")
        print("="*60)

if __name__ == "__main__":
    run_seed()
