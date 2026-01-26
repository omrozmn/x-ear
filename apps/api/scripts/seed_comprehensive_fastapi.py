#!/usr/bin/env python3
"""
Comprehensive Data Seeder for FastAPI Backend
Seeds all required data for zero-tolerance API testing.

Usage:
    cd apps/backend
    python scripts/seed_comprehensive_fastapi.py
"""
import os
import sys
import random
import json
from datetime import datetime, timedelta, timezone
from uuid import uuid4

# Add backend to path
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
sys.path.insert(0, backend_dir)

# Now import from project
from database import SessionLocal, engine, Base
from werkzeug.security import generate_password_hash

# Import all models
from models.tenant import Tenant
from models.user import User
from models.admin_user import AdminUser
from models.role import Role
from models.branch import Branch
from core.models.party import Party as Patient
from core.models.enums import PatientStatus
from models.appointment import Appointment
from models.inventory import InventoryItem
from models.device import Device
from models.sales import Sale, DeviceAssignment
from models.invoice import Invoice
from models.notification import Notification
from models.campaign import Campaign
from models.plan import Plan
from models.subscription import Subscription
from models.suppliers import Supplier

try:
    from faker import Faker
    fake = Faker('tr_TR')
except ImportError:
    print("Faker not installed. Installing...")
    os.system(f"{sys.executable} -m pip install faker")
    from faker import Faker
    fake = Faker('tr_TR')

# Configuration
DEFAULT_PASSWORD = "Test123!"
PASSWORD_HASH = generate_password_hash(DEFAULT_PASSWORD, method='pbkdf2:sha256')

def now_utc():
    return datetime.now(timezone.utc)

def gen_id(prefix=""):
    return f"{prefix}_{uuid4().hex[:8]}"

class ComprehensiveSeeder:
    def __init__(self):
        self.db = SessionLocal()
        self.tenant = None
        self.branch = None
        self.users = {}
        self.patients = []
        self.inventory = []
        self.appointments = []
        self.sales = []
        
    def close(self):
        self.db.close()

    def run(self):
        print("\n" + "="*60)
        print("🚀 COMPREHENSIVE DATA SEEDER FOR ZERO-TOLERANCE TESTING")
        print("="*60 + "\n")
        
        try:
            print("🛠️ Creating tables...")
            Base.metadata.create_all(bind=engine)
            
            self._seed_plans()
            self._seed_admin_users()
            self._seed_tenant()
            self._seed_branches()
            self._seed_roles()
            self._seed_tenant_users()
            self._seed_subscription()
            self._seed_suppliers()
            self._seed_inventory()
            self._seed_patients()
            self._seed_appointments()
            self._seed_sales()
            self._seed_notifications()
            self._seed_campaigns()
            
            self.db.commit()
            print("\n" + "="*60)
            print("✅ ALL DATA SEEDED SUCCESSFULLY!")
            print("="*60)
            self._print_credentials()
            
        except Exception as e:
            self.db.rollback()
            print(f"\n❌ ERROR: {e}")
            import traceback
            traceback.print_exc()
            raise
        finally:
            self.close()

    def _seed_plans(self):
        print("📦 Seeding Plans...")
        from models.plan import PlanType, BillingInterval
        plans_data = [
            {"id": "plan_starter", "name": "Starter", "slug": "starter", "price": 99, "plan_type": PlanType.BASIC, "billing_interval": BillingInterval.MONTHLY},
            {"id": "plan_pro", "name": "Professional", "slug": "professional", "price": 299, "plan_type": PlanType.PRO, "billing_interval": BillingInterval.MONTHLY},
            {"id": "plan_enterprise", "name": "Enterprise", "slug": "enterprise", "price": 999, "plan_type": PlanType.ENTERPRISE, "billing_interval": BillingInterval.MONTHLY},
        ]
        for pdata in plans_data:
            existing = self.db.query(Plan).filter_by(id=pdata["id"]).first()
            if not existing:
                plan = Plan(
                    id=pdata["id"],
                    name=pdata["name"],
                    slug=pdata["slug"],
                    price=pdata["price"],
                    plan_type=pdata["plan_type"],
                    billing_interval=pdata["billing_interval"],
                    is_active=True,
                    features=json.dumps(["patients", "appointments", "invoices", "reports"])
                )
                self.db.add(plan)
        self.db.commit()
        print(f"   ✓ {len(plans_data)} plans ready")

    def _seed_admin_users(self):
        print("👤 Seeding Admin Users...")
        
        admins = [
            {"email": "superadmin@x-ear.com", "first_name": "Super", "last_name": "Admin", "role": "super_admin"},
            {"email": "platformadmin@x-ear.com", "first_name": "Platform", "last_name": "Admin", "role": "platform_admin"},
            {"email": "admin@x-ear.com", "first_name": "Admin", "last_name": "User", "role": "super_admin"},
        ]
        
        for admin_data in admins:
            existing = self.db.query(AdminUser).filter_by(email=admin_data["email"]).first()
            if not existing:
                admin = AdminUser(
                    id=gen_id("adm"),
                    email=admin_data["email"],
                    password_hash=PASSWORD_HASH,
                    first_name=admin_data["first_name"],
                    last_name=admin_data["last_name"],
                    role=admin_data["role"],
                    is_active=True
                )
                self.db.add(admin)
            else:
                existing.password_hash = PASSWORD_HASH
                existing.is_active = True
        
        self.db.commit()
        print(f"   ✓ {len(admins)} admin users ready")

    def _seed_tenant(self):
        print("🏢 Seeding Tenant...")
        
        self.tenant = self.db.query(Tenant).filter_by(name="Test Clinic").first()
        if not self.tenant:
            from core.models.tenant import TenantStatus
            self.tenant = Tenant(
                id=gen_id("tenant"),
                name="Test Clinic",
                slug="test-clinic",
                owner_email="clinic@test.com",
                billing_email="billing@test.com",
                status=TenantStatus.ACTIVE.value,
                settings={}
            )
            self.db.add(self.tenant)
            self.db.commit()
        
        print(f"   ✓ Tenant: {self.tenant.name} ({self.tenant.id})")

    def _seed_branches(self):
        print("🏪 Seeding Branches...")
        
        branches_data = [
            {"name": "Merkez Şube", "address": "Kadıköy, İstanbul"},
            {"name": "Anadolu Şube", "address": "Ümraniye, İstanbul"},
        ]
        
        for bdata in branches_data:
            existing = self.db.query(Branch).filter_by(
                name=bdata["name"], 
                tenant_id=self.tenant.id
            ).first()
            if not existing:
                branch = Branch(
                    id=gen_id("branch"),
                    tenant_id=self.tenant.id,
                    name=bdata["name"],
                    address=bdata["address"]
                )
                self.db.add(branch)
                if not self.branch:
                    self.branch = branch
        
        self.db.commit()
        if not self.branch:
            self.branch = self.db.query(Branch).filter_by(tenant_id=self.tenant.id).first()
        print(f"   ✓ {len(branches_data)} branches ready")

    def _seed_roles(self):
        print("🔐 Seeding Roles...")
        
        roles_data = [
            {"name": "admin", "description": "Tenant Administrator"},
            {"name": "manager", "description": "Branch Manager"},
            {"name": "staff", "description": "Staff Member"},
            {"name": "clinician", "description": "Clinician/Audiologist"},
        ]
        
        for rdata in roles_data:
            existing = self.db.query(Role).filter_by(name=rdata["name"]).first()
            if not existing:
                role = Role(
                    id=gen_id("role"),
                    name=rdata["name"],
                    description=rdata["description"],
                    is_system=False
                )
                self.db.add(role)
        
        self.db.commit()
        print(f"   ✓ {len(roles_data)} roles ready")

    def _seed_tenant_users(self):
        print("👥 Seeding Tenant Users...")
        
        users_data = [
            {"email": "tenantadmin@test.com", "username": "tenantadmin", "first_name": "Tenant", "last_name": "Admin", "role": "admin"},
            {"email": "manager@test.com", "username": "manager", "first_name": "Manager", "last_name": "User", "role": "manager"},
            {"email": "staff@test.com", "username": "staff", "first_name": "Staff", "last_name": "User", "role": "staff"},
            {"email": "clinician@test.com", "username": "clinician", "first_name": "Clinician", "last_name": "User", "role": "clinician"},
        ]
        
        for udata in users_data:
            existing = self.db.query(User).filter_by(email=udata["email"]).first()
            if not existing:
                user = User(
                    id=gen_id("usr"),
                    tenant_id=self.tenant.id,
                    email=udata["email"],
                    username=udata["username"],
                    password_hash=PASSWORD_HASH,
                    first_name=udata["first_name"],
                    last_name=udata["last_name"],
                    role=udata["role"],
                    is_active=True
                )
                self.db.add(user)
                self.users[udata["role"]] = user
            else:
                existing.password_hash = PASSWORD_HASH
                existing.is_active = True
                existing.tenant_id = self.tenant.id
                self.users[udata["role"]] = existing
        
        self.db.commit()
        print(f"   ✓ {len(users_data)} tenant users ready")

    def _seed_subscription(self):
        print("📋 Seeding Subscription...")
        
        plan = self.db.query(Plan).first()
        if not plan:
            print("   ⚠ No plan found, skipping subscription")
            return
            
        existing = self.db.query(Subscription).filter_by(tenant_id=self.tenant.id).first()
        if not existing:
            sub = Subscription(
                id=gen_id("sub"),
                tenant_id=self.tenant.id,
                plan_id=plan.id,
                status="active",
                current_period_start=now_utc(),
                current_period_end=now_utc() + timedelta(days=30)
            )
            self.db.add(sub)
            self.db.commit()
        
        print(f"   ✓ Subscription active")

    def _seed_suppliers(self):
        print("🏭 Seeding Suppliers...")
        
        for i in range(5):
            company_code = f"SUP-{uuid4().hex[:8].upper()}"
            company_name = f"{fake.company()} - {company_code[-4:]}"
            # Check for existing by company_code instead of volatile name
            existing = self.db.query(Supplier).filter_by(company_code=company_code).first()
            if not existing:
                sup = Supplier(
                    tenant_id=self.tenant.id,
                    company_name=company_name,
                    company_code=company_code,
                    contact_person=fake.name(),
                    email=f"supplier{i+1}_{uuid4().hex[:4]}@example.com",
                    phone=fake.phone_number(),
                    address=fake.address(),
                    city=fake.city(),
                    country="Türkiye",
                    is_active=True
                )
                self.db.add(sup)
        
        self.db.commit()
        print(f"   ✓ 5 suppliers ready")

    def _seed_inventory(self):
        print("📦 Seeding Inventory...")
        
        categories = ["hearing_aid", "aksesuar", "pil", "bakim"]
        brands = ["Phonak", "Oticon", "Widex", "Signia", "ReSound"]
        
        for i in range(30):
            cat = random.choice(categories)
            brand = random.choice(brands)
            serials = [f"SN-{uuid4().hex[:8].upper()}" for _ in range(random.randint(1, 5))] if cat == "hearing_aid" else []
            features = ["Bluetooth", "Şarj Edilebilir", "Su Geçirmez"][:random.randint(0, 3)] if cat == "hearing_aid" else []
            
            inv = InventoryItem(
                id=gen_id("inv"),
                tenant_id=self.tenant.id,
                name=f"{brand} {fake.word().capitalize()} {i+1}",
                brand=brand,
                model=f"Model-{random.randint(100, 999)}",
                category=cat,
                barcode=fake.ean13(),
                description=fake.sentence(),
                available_inventory=len(serials) if serials else random.randint(5, 50),
                total_inventory=random.randint(10, 100),
                available_serials=json.dumps(serials) if serials else None,
                features=json.dumps(features) if features else None,
                price=round(random.uniform(100, 25000), 2),
                warranty=random.choice([0, 12, 24])
            )
            self.db.add(inv)
            self.inventory.append(inv)
        
        self.db.commit()
        print(f"   ✓ 30 inventory items ready")

    def _seed_patients(self):
        print("🏥 Seeding Patients...")
        
        # Use uppercase status values to match the PatientStatus enum
        statuses = ["ACTIVE", "LEAD", "INACTIVE"]
        segments = ["LEAD", "QUALIFIED", "CUSTOMER", "VIP"]
        
        for i in range(50):
            phone = f"05{random.randint(30, 59)}{random.randint(1000000, 9999999)}"
            tc = ''.join([str(random.randint(0, 9)) for _ in range(11)])
            
            # Check for existing
            existing = self.db.query(Patient).filter_by(phone=phone).first()
            if existing:
                self.patients.append(existing)
                continue
                
            patient = Patient(
                id=gen_id("pat"),
                tenant_id=self.tenant.id,
                branch_id=self.branch.id if self.branch else None,
                first_name=fake.first_name(),
                last_name=fake.last_name(),
                phone=phone,
                email=fake.email(),
                tc_number=tc,
                birth_date=fake.date_of_birth(minimum_age=18, maximum_age=85),
                gender=random.choice(["M", "F"]),
                address_city=fake.city(),
                address_district=fake.city(),
                address_full=fake.address(),
                status=PatientStatus.from_legacy(random.choice(statuses)),
                segment=random.choice(segments)
            )
            self.db.add(patient)
            self.patients.append(patient)
        
        self.db.commit()
        print(f"   ✓ {len(self.patients)} patients ready")

    def _seed_appointments(self):
        print("📅 Seeding Appointments...")
        
        if not self.patients:
            print("   ⚠ No patients, skipping appointments")
            return
        
        apt_types = ["consultation", "hearing_test", "device_fitting", "control"]
        
        for i in range(20):
            patient = random.choice(self.patients)
            apt_date = now_utc() + timedelta(days=random.randint(-30, 30))
            
            apt = Appointment(
                id=gen_id("apt"),
                tenant_id=self.tenant.id,
                party_id=patient.id,
                branch_id=self.branch.id if self.branch else None,
                date=apt_date,
                time=f"{random.randint(9, 17):02d}:00",
                duration=random.choice([30, 45, 60]),
                appointment_type=random.choice(apt_types),
                notes=fake.sentence()
            )
            self.db.add(apt)
            self.appointments.append(apt)
        
        self.db.commit()
        print(f"   ✓ 20 appointments ready")

    def _seed_sales(self):
        print("💰 Seeding Sales...")
        
        if not self.patients or not self.inventory:
            print("   ⚠ Missing patients or inventory, skipping sales")
            return
        
        # Check if we already have enough sales
        existing_count = self.db.query(Sale).filter_by(tenant_id=self.tenant.id).count()
        if existing_count >= 20:
            print(f"   ✓ {existing_count} sales already exist (skipping)")
            return
        
        for i in range(20):
            patient = random.choice(self.patients)
            product = random.choice(self.inventory)
            price = float(product.price) if product.price else random.uniform(1000, 20000)
            discount = round(price * random.choice([0, 0.05, 0.1, 0.15]), 2)
            final = round(price - discount, 2)
            
            # Use UUID-based unique ID
            sale_id = f"sale_{uuid4().hex[:10]}"
            
            sale = Sale(
                id=sale_id,
                tenant_id=self.tenant.id,
                party_id=patient.id,
                product_id=product.id,
                sale_date=now_utc() - timedelta(days=random.randint(0, 90)),
                list_price_total=price,
                total_amount=price,
                discount_amount=discount,
                final_amount=final,
                paid_amount=final if random.random() > 0.3 else round(final * 0.5, 2),
                status=random.choice(["pending", "completed"]),
                payment_method=random.choice(["cash", "card", "installment"])
            )
            self.db.add(sale)
            self.sales.append(sale)
        
        self.db.commit()
        print(f"   ✓ 20 sales ready")

    def _seed_notifications(self):
        print("🔔 Seeding Notifications...")
        
        for i in range(5):
            notif = Notification(
                id=gen_id("notif"),
                tenant_id=self.tenant.id,
                user_id=self.users.get("admin").id if self.users.get("admin") else "system",
                title=f"Bildirim {i+1}",
                message=fake.sentence(),
                notification_type=random.choice(["info", "warning", "success"]),
                is_read=random.choice([True, False])
            )
            self.db.add(notif)
        
        self.db.commit()
        print(f"   ✓ 5 notifications ready")

    def _seed_campaigns(self):
        print("📢 Seeding Campaigns...")
        
        for i in range(3):
            campaign = Campaign(
                id=gen_id("camp"),
                tenant_id=self.tenant.id,
                name=f"Kampanya {i+1}",
                description=fake.paragraph(),
                campaign_type=random.choice(["sms", "email"]),
                message_template=f"Merhaba, {fake.sentence()}",
                status=random.choice(["draft", "scheduled", "sent"]),
                scheduled_at=now_utc() + timedelta(days=random.randint(1, 30))
            )
            self.db.add(campaign)
        
        self.db.commit()
        print(f"   ✓ 3 campaigns ready")

    def _print_credentials(self):
        print("\n" + "="*60)
        print("🔑 TEST CREDENTIALS (Password: Test123!)")
        print("="*60)
        print("\n📌 ADMIN PANEL:")
        print("   superadmin@x-ear.com")
        print("   platformadmin@x-ear.com")
        print("   admin@x-ear.com")
        print("\n📌 WEB APP (Tenant Users):")
        print("   tenantadmin@test.com")
        print("   manager@test.com")
        print("   staff@test.com")
        print("   clinician@test.com")
        print("\n" + "="*60)


if __name__ == "__main__":
    seeder = ComprehensiveSeeder()
    seeder.run()
