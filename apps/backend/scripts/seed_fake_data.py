#!/usr/bin/env python3
"""
Seed fake data for local development (robust, safe-by-default).

Features:
- Uses the project's Flask app and SQLAlchemy models (runs inside app context).
- Ensures backend/ and project root are added to sys.path so absolute imports like
  `routes.*` and `models.*` resolve correctly.
- Uses `Faker` when available; falls back to a simple deterministic generator when not.
- Dry-run by default; use --apply to persist changes. When applying, a sqlite
  backup is created automatically.
- Default creates 50 records per table; configurable via --count and --tables.

Usage:
  # dry-run (no writes)
  python backend/scripts/seed_fake_data.py --count 50

  # actually write 50 rows per table (creates a DB backup first)
  python backend/scripts/seed_fake_data.py --count 50 --apply

Note: Intended for development only. Do NOT run against production databases.
"""
from __future__ import annotations

import argparse
import os
import sys
import shutil
import random
import json
import logging
from datetime import datetime, timedelta, date
from typing import Dict, Any, List
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# --- Configuration ---
DEFAULT_TABLES = [
    'suppliers',
    'inventories',
    'patients',
    'devices',
    'appointments',
    'sales',
    'device_assignments',
    'payment_plans',
    'payment_installments',
    'payment_records',
    'invoices',
    'proformas',
    'product_suppliers'
]
DEFAULT_COUNT = 50
BACKUP_SUFFIX_FORMAT = '%Y%m%d_%H%M%S'
COMMIT_BATCH = 50

logger = logging.getLogger('seed_fake_data')
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')


# --- Helper: ensure import paths so `backend` and absolute `routes`/`models` imports resolve ---
def ensure_sys_path():
    script_dir = os.path.dirname(__file__)
    backend_dir = os.path.abspath(os.path.join(script_dir, '..'))
    project_root = os.path.abspath(os.path.join(script_dir, '..', '..'))

    # Insert backend directory first so absolute imports such as `import routes` map
    # to backend/routes, matching how the application starts in development.
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    if project_root not in sys.path:
        sys.path.insert(0, project_root)


# --- Faker loader with minimal fallback ---
class _UniqueProxy:
    def __init__(self, parent):
        self._parent = parent
        self._used = {}

    def __getattr__(self, item):
        def _unique_func(*args, **kwargs):
            for _ in range(5):
                val = getattr(self._parent, item)(*args, **kwargs)
                used = self._used.setdefault(item, set())
                if val not in used:
                    used.add(val)
                    return val
            base = getattr(self._parent, item)(*args, **kwargs)
            seq = len(self._used.get(item, set())) + 1
            val = f"{base}-{seq}"
            self._used.setdefault(item, set()).add(val)
            return val

        return _unique_func


class MinimalFaker:
    """A tiny fallback faker sufficient for seeding when Faker isn't installed.
    Produces deterministic, reasonably varied values and supports unique.* calls
    used by the seeder.
    """

    _FIRSTS = ['Ahmet', 'Mehmet', 'Ayse', 'Fatma', 'Can', 'Deniz', 'Onur', 'Elif']
    _LASTS = ['Yilmaz', 'Demir', 'Kaya', 'Yildiz', 'Ozturk', 'Celik', 'Aydin', 'Gunes']
    _CITIES = ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya']

    def __init__(self, seed: int | None = None):
        self._seq = 0
        self.unique = _UniqueProxy(self)
        if seed is not None:
            random.seed(seed)

    def _next(self) -> int:
        self._seq += 1
        return self._seq

    def company(self) -> str:
        return f"Company {self._next()}"

    def bothify(self, text: str = '') -> str:
        letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        digits = '0123456789'
        out = []
        for c in text:
            if c == '?':
                out.append(random.choice(letters))
            elif c == '#':
                out.append(random.choice(digits))
            else:
                out.append(c)
        return ''.join(out)

    def company_email(self) -> str:
        n = self._next()
        return f'contact{n}@company{n}.local'

    def phone_number(self) -> str:
        return f'+90{random.randint(500000000, 599999999):09d}'

    def url(self) -> str:
        return f"https://www.company{self._next()}.local"

    def address(self) -> str:
        return f"{random.randint(1, 900)} Example St, {random.choice(self._CITIES)}"

    def city(self) -> str:
        return random.choice(self._CITIES)

    def word(self) -> str:
        return f"word{self._next()}"

    def lexify(self, text: str = '') -> str:
        return self.bothify(text)

    def ean13(self) -> str:
        return ''.join(str(random.randint(0, 9)) for _ in range(13))

    def first_name(self) -> str:
        return random.choice(self._FIRSTS)

    def last_name(self) -> str:
        return random.choice(self._LASTS)

    def email(self) -> str:
        n = self._next()
        return f'user{n}@local.example'

    def name(self) -> str:
        return f"{self.first_name()} {self.last_name()}"

    def sentence(self, nb_words: int = 6) -> str:
        return ' '.join(self.word() for _ in range(max(1, nb_words)))

    def date_of_birth(self, minimum_age: int = 18, maximum_age: int = 80):
        today = date.today()
        start = today.replace(year=today.year - maximum_age)
        end = today.replace(year=today.year - minimum_age)
        delta = (end - start).days or 1
        return start + timedelta(days=random.randint(0, delta))

    def date_time_between(self, start_date='-90d', end_date='now'):
        now = datetime.utcnow()
        def parse_rel(s):
            if s == 'now':
                return now
            if isinstance(s, str) and s.endswith('d'):
                try:
                    n = int(s[:-1])
                    return now + timedelta(days=n)
                except Exception:
                    return now
            try:
                return datetime.fromisoformat(s)
            except Exception:
                return now
        a = parse_rel(start_date)
        b = parse_rel(end_date)
        if a > b:
            a, b = b, a
        span = (b - a).total_seconds()
        if span <= 0:
            return a
        return a + timedelta(seconds=random.randint(0, int(span)))


def get_faker(seed: int | None = None):
    try:
        from faker import Faker
        faker = Faker('tr_TR')
        if seed is not None:
            Faker.seed(seed)
        return faker
    except Exception:
        logger.warning('Faker package not available; using MinimalFaker fallback')
        return MinimalFaker(seed)


# --- DB backup helper ---
def backup_sqlite(db_path: str, dest_dir: str | None = None) -> str:
    if not os.path.exists(db_path):
        raise FileNotFoundError(f'Database not found: {db_path}')
    ts = datetime.utcnow().strftime(BACKUP_SUFFIX_FORMAT)
    if dest_dir:
        os.makedirs(dest_dir, exist_ok=True)
        dest = os.path.join(dest_dir, f'xear_crm.db.bak.{ts}')
    else:
        dest = f'{db_path}.bak.{ts}'
    shutil.copy2(db_path, dest)
    return dest


def safe_commit(session):
    try:
        session.commit()
    except Exception:
        session.rollback()
        raise


# --- Seeder functions (use SQLAlchemy models in ctx) ---
# Each returns list of created objects for summary


def seed_suppliers(faker, count: int, ctx: Dict[str, Any]) -> List[Any]:
    Supplier = ctx['Supplier']
    session = ctx['session']
    created = []
    for i in range(count):
        company_name = faker.unique.company() if hasattr(faker, 'unique') else faker.company()
        try:
            # Try to avoid duplicates based on company_name
            existing = session.query(Supplier).filter_by(company_name=company_name).first()
            if existing:
                # Update existing contact and skip creating
                existing.contact_person = faker.name()
                existing.email = faker.unique.company_email() if hasattr(faker, 'unique') else faker.company_email()
                session.add(existing)
                created.append(existing)
            else:
                s = Supplier(
                    company_name=company_name,
                    company_code=(faker.unique.bothify(text='SUP-??-####') if hasattr(faker, 'unique') else faker.bothify(text='SUP-??-####')),
                    contact_person=faker.name(),
                    email=(faker.unique.company_email() if hasattr(faker, 'unique') else faker.company_email()),
                    phone=faker.phone_number(),
                    mobile=faker.phone_number(),
                    website=faker.url(),
                    address=faker.address(),
                    city=faker.city(),
                    country='Türkiye',
                    payment_terms=random.choice(['Net 30', 'Net 45', 'COD']),
                    currency='TRY',
                    rating=random.randint(1, 5),
                    is_active=True,
                )
                session.add(s)
                created.append(s)
            if len(created) % COMMIT_BATCH == 0:
                safe_commit(session)
        except Exception as e:
            logger.warning('Failed to create supplier (%s): %s', company_name, e)
            session.rollback()
            continue
    safe_commit(session)
    return created


def seed_inventories(faker, count: int, ctx: Dict[str, Any]) -> List[Any]:
    Inventory = ctx['Inventory']
    session = ctx['session']
    Supplier = ctx.get('Supplier')
    suppliers = ctx.get('suppliers') or (session.query(Supplier).limit(20).all() if Supplier else [])
    created = []
    categories = ['hearing_aid', 'aksesuar', 'pil', 'bakim']
    for _ in range(count):
        supplier = random.choice(suppliers) if suppliers else None
        category = random.choice(categories)
        serials = []
        if category == 'hearing_aid' and random.random() < 0.6:
            serials = [(faker.unique.bothify(text='SN-????-####') if hasattr(faker, 'unique') else faker.bothify(text='SN-????-####')) for __ in range(random.randint(1, 4))]
        available_inventory = len(serials) if serials else random.randint(1, 100)
        total_inventory = available_inventory + random.randint(0, 50)
        data = {
            'name': faker.word().capitalize() + ' ' + (faker.lexify(text='Model-???') if hasattr(faker, 'lexify') else faker.lexify(text='Model-???')),
            'brand': faker.company(),
            'model': faker.lexify(text='M-####'),
            'category': category,
            'barcode': (faker.unique.ean13() if hasattr(faker, 'unique') else faker.ean13()),
            'supplier': supplier.company_name if supplier else None,
            'description': faker.sentence(nb_words=6),
            'availableInventory': available_inventory,
            'totalInventory': total_inventory,
            'availableSerials': serials,
            'features': [faker.word() for __ in range(random.randint(0, 3))],
            'price': round(random.uniform(50.0, 25000.0), 2),
            'warranty': random.choice([0, 6, 12, 24])
        }
        try:
            item = Inventory.from_dict(data)
            session.add(item)
            created.append(item)
            if len(created) % COMMIT_BATCH == 0:
                safe_commit(session)
        except Exception as e:
            logger.warning('Failed to create inventory item: %s', e)
            session.rollback()
            continue
    safe_commit(session)
    return created


def seed_patients(faker, count: int, ctx: Dict[str, Any]) -> List[Any]:
    Patient = ctx['Patient']
    session = ctx['session']
    created = []
    for _ in range(count):
        first = faker.first_name()
        last = faker.last_name()
        phone = faker.unique.phone_number() if hasattr(faker, 'unique') else faker.phone_number()
        tc = None
        # Attempt to generate unique TC where possible
        for _ in range(3):
            candidate = ''.join(str(random.randint(0, 9)) for _ in range(11))
            if not session.query(Patient).filter_by(tc_number=candidate).first():
                tc = candidate
                break
        if not tc:
            tc = candidate
        data = {
            'firstName': first,
            'lastName': last,
            'phone': phone,
            'email': faker.unique.email() if hasattr(faker, 'unique') else faker.email(),
            'birthDate': faker.date_of_birth(minimum_age=18, maximum_age=80).isoformat() if hasattr(faker, 'date_of_birth') else str(faker.date_of_birth()),
            'tcNumber': tc,
            'address': {'city': faker.city(), 'fullAddress': faker.address()},
        }
        try:
            p = Patient.from_dict(data)
            session.add(p)
            created.append(p)
            if len(created) % COMMIT_BATCH == 0:
                safe_commit(session)
        except Exception as e:
            logger.warning('Failed to create patient: %s', e)
            session.rollback()
            continue
    safe_commit(session)
    return created


def seed_devices(faker, count: int, ctx: Dict[str, Any]) -> List[Any]:
    Device = ctx['Device']
    session = ctx['session']
    inventories = ctx.get('inventories') or []
    patients = ctx.get('patients') or []
    created = []
    for _ in range(count):
        inv = random.choice(inventories) if inventories else None
        patient = random.choice(patients) if patients and random.random() < 0.5 else None
        try:
            d = Device()
            d.inventory_id = inv.id if inv else None
            d.patient_id = patient.id if patient else None
            d.serial_number = faker.unique.bothify(text='DEV-????-#####') if hasattr(faker, 'unique') else faker.bothify(text='DEV-????-#####')
            d.brand = faker.company()
            d.model = faker.lexify(text='D-####')
            d.device_type = random.choice(['BTE', 'ITE', 'CIC'])
            d.price = round(random.uniform(200.0, 25000.0), 2)
            d.notes = faker.sentence()
            session.add(d)
            created.append(d)
            if len(created) % COMMIT_BATCH == 0:
                safe_commit(session)
        except Exception as e:
            logger.warning('Failed to create device: %s', e)
            session.rollback()
            continue
    safe_commit(session)
    return created


def seed_appointments(faker, count: int, ctx: Dict[str, Any]) -> List[Any]:
    Appointment = ctx['Appointment']
    session = ctx['session']
    patients = ctx.get('patients') or []
    created = []
    for _ in range(count):
        if not patients:
            break
        patient = random.choice(patients)
        dt = faker.date_time_between(start_date='-180d', end_date='+180d') if hasattr(faker, 'date_time_between') else datetime.utcnow()
        appt = Appointment(
            patient_id=patient.id,
            clinician_id=None,
            branch_id=None,
            date=dt,
            time=dt.strftime('%H:%M'),
            duration=random.choice([20, 30, 45, 60]),
            appointment_type=random.choice(['consultation', 'fitting', 'follow-up']),
            notes=faker.sentence()
        )
        try:
            session.add(appt)
            created.append(appt)
            if len(created) % COMMIT_BATCH == 0:
                safe_commit(session)
        except Exception as e:
            logger.warning('Failed to create appointment: %s', e)
            session.rollback()
            continue
    safe_commit(session)
    return created


def seed_sales(faker, count: int, ctx: Dict[str, Any]) -> List[Any]:
    Sale = ctx['Sale']
    session = ctx['session']
    patients = ctx.get('patients') or []
    inventories = ctx.get('inventories') or []
    created = []
    # Prepare a daily prefix and starting sequence to avoid duplicate IDs when
    # creating many Sale objects in the same run. This mirrors the application's
    # gen_sale_id but avoids per-object DB counting which can lead to collisions
    # during batch inserts.
    now = datetime.now()
    yy = str(now.year)[-2:]
    mm = f"{now.month:02d}"
    dd = f"{now.day:02d}"
    kk = "01"
    prefix = f"{yy}{mm}{dd}{kk}"
    # Find the largest existing sequence for today's prefix
    try:
        last_row = session.query(Sale.id).filter(Sale.id.like(f"{prefix}%"))\
            .order_by(Sale.id.desc()).limit(1).first()
        if last_row and last_row[0]:
            last_seq = int(last_row[0][-2:])
        else:
            last_seq = 0
    except Exception:
        last_seq = 0
    for _ in range(count):
        if not patients:
            break
        patient = random.choice(patients)
        product = random.choice(inventories) if inventories else None
        price = float(getattr(product, 'price', round(random.uniform(100.0, 20000.0), 2)))
        discount = round(price * random.choice([0, 0.05, 0.1, 0.15]), 2)
        final = round(price - discount, 2)
        sale_date = faker.date_time_between(start_date='-90d', end_date='now') if hasattr(faker, 'date_time_between') else datetime.utcnow()
        # Assign deterministic id using prefix + incremental sequence
        seq = last_seq + 1
        sale_id = f"{prefix}{seq:02d}"
        sale = Sale(
            patient_id=patient.id,
            product_id=product.id if product else None,
            sale_date=sale_date,
            list_price_total=price,
            total_amount=price,
            discount_amount=discount,
            final_amount=final,
            paid_amount=final if random.random() < 0.8 else round(final * random.uniform(0.1, 0.9), 2),
            status=(random.choice(['pending', 'completed']) if random.random() < 0.9 else 'pending'),
            payment_method=random.choice(['cash', 'card', 'installment'])
        )
        # Override auto-generated id to ensure uniqueness within this batch
        try:
            sale.id = sale_id
            last_seq = seq
        except Exception:
            pass
        try:
            session.add(sale)
            created.append(sale)
            if len(created) % COMMIT_BATCH == 0:
                safe_commit(session)
        except Exception as e:
            logger.warning('Failed to create sale: %s', e)
            session.rollback()
            continue
    safe_commit(session)
    return created


def seed_device_assignments(faker, count: int, ctx: Dict[str, Any]) -> List[Any]:
    DeviceAssignment = ctx['DeviceAssignment']
    session = ctx['session']
    devices = ctx.get('devices') or []
    patients = ctx.get('patients') or []
    sales = ctx.get('sales') or []
    created = []
    for _ in range(count):
        if not devices or not patients:
            break
        device = random.choice(devices)
        patient = random.choice(patients)
        sale = random.choice(sales) if sales else None
        da = DeviceAssignment(
            patient_id=patient.id,
            device_id=device.id,
            sale_id=sale.id if sale else None,
            ear=random.choice(['L', 'R', 'B']),
            reason=random.choice(['sale', 'trial', 'replacement']),
            from_inventory=True,
            list_price=round(random.uniform(500.0, 15000.0), 2),
            sale_price=round(random.uniform(400.0, 14000.0), 2),
            net_payable=round(random.uniform(400.0, 14000.0), 2),
            payment_method=random.choice(['cash', 'card'])
        )
        try:
            session.add(da)
            created.append(da)
            if len(created) % COMMIT_BATCH == 0:
                safe_commit(session)
        except Exception as e:
            logger.warning('Failed to create device assignment: %s', e)
            session.rollback()
            continue
    safe_commit(session)
    return created


def seed_payment_plans_and_installments(faker, count: int, ctx: Dict[str, Any]):
    PaymentPlan = ctx['PaymentPlan']
    PaymentInstallment = ctx['PaymentInstallment']
    session = ctx['session']
    sales = ctx.get('sales') or []
    created_plans = []
    created_installments = []
    for _ in range(count):
        if not sales:
            break
        sale = random.choice(sales)
        plan = PaymentPlan(
            sale_id=sale.id,
            plan_name=faker.sentence(nb_words=3),
            total_amount=float(getattr(sale, 'final_amount', round(random.uniform(400.0, 15000.0), 2))),
            installment_count=random.choice([2, 3, 6]),
            installment_amount=round((float(getattr(sale, 'final_amount', None) or 0.0) / random.choice([2, 3, 6])), 2),
            interest_rate=0.0,
            processing_fee=0.0,
            status='active',
            start_date=datetime.utcnow()
        )
        try:
            session.add(plan)
            created_plans.append(plan)
            if len(created_plans) % 20 == 0:
                safe_commit(session)
        except Exception as e:
            logger.warning('Failed to create payment plan: %s', e)
            session.rollback()
            continue

    safe_commit(session)
    # Installments
    for plan in created_plans:
        for n in range(1, (plan.installment_count or 1) + 1):
            inst = PaymentInstallment(
                payment_plan_id=plan.id,
                installment_number=n,
                due_date=datetime.utcnow() + timedelta(days=30 * n),
                amount=float(plan.installment_amount) if getattr(plan, 'installment_amount', None) else 0.0,
                status='pending'
            )
            try:
                session.add(inst)
                created_installments.append(inst)
            except Exception as e:
                logger.warning('Failed to create installment: %s', e)
                session.rollback()
                continue
    safe_commit(session)
    return created_plans, created_installments


def seed_payment_records(faker, count: int, ctx: Dict[str, Any]) -> List[Any]:
    PaymentRecord = ctx['PaymentRecord']
    session = ctx['session']
    sales = ctx.get('sales') or []
    created = []
    for _ in range(count):
        if not sales:
            break
        sale = random.choice(sales)
        pr = PaymentRecord(
            patient_id=sale.patient_id,
            sale_id=sale.id,
            amount=float(sale.final_amount) if getattr(sale, 'final_amount', None) else round(random.uniform(100.0, 5000.0), 2),
            payment_date=datetime.utcnow(),
            payment_method=random.choice(['cash', 'card']),
            payment_type='payment',
            status='paid'
        )
        try:
            session.add(pr)
            created.append(pr)
            if len(created) % COMMIT_BATCH == 0:
                safe_commit(session)
        except Exception as e:
            logger.warning('Failed to create payment record: %s', e)
            session.rollback()
            continue
    safe_commit(session)
    return created


def seed_invoices(faker, count: int, ctx: Dict[str, Any]) -> List[Any]:
    Invoice = ctx['Invoice']
    session = ctx['session']
    sales = ctx.get('sales') or []
    created = []
    for _ in range(count):
        sale = random.choice(sales) if sales else None
        invoice = Invoice(
            invoice_number=f"INV-{datetime.utcnow().strftime('%Y%m%d')}-{random.randint(1000, 9999)}",
            sale_id=sale.id if sale else None,
            patient_id=sale.patient_id if sale else None,
            device_id=None,
            device_name=None,
            device_serial=None,
            device_price=float(sale.final_amount) if sale and getattr(sale, 'final_amount', None) else round(random.uniform(100.0, 10000.0), 2),
            patient_name=None,
            patient_tc=None,
            status='active'
        )
        try:
            session.add(invoice)
            created.append(invoice)
            if len(created) % COMMIT_BATCH == 0:
                safe_commit(session)
        except Exception as e:
            logger.warning('Failed to create invoice: %s', e)
            session.rollback()
            continue
    safe_commit(session)
    return created


def seed_proformas(faker, count: int, ctx: Dict[str, Any]) -> List[Any]:
    Proforma = ctx['Proforma']
    session = ctx['session']
    patients = ctx.get('patients') or []
    created = []
    for _ in range(count):
        patient = random.choice(patients) if patients else None
        pf = Proforma(
            proforma_number=f"PF-{datetime.utcnow().strftime('%Y%m%d')}-{random.randint(1000, 9999)}",
            patient_id=patient.id if patient else None,
            company_name=faker.company(),
            device_name=faker.word(),
            device_price=round(random.uniform(100.0, 10000.0), 2),
            devices=json.dumps([{'name': faker.word(), 'price': round(random.uniform(100.0, 10000.0), 2)}]),
            patient_name=f"{patient.first_name} {patient.last_name}" if patient else None,
            patient_tc=patient.tc_number if patient else None,
            status='pending'
        )
        try:
            session.add(pf)
            created.append(pf)
            if len(created) % COMMIT_BATCH == 0:
                safe_commit(session)
        except Exception as e:
            logger.warning('Failed to create proforma: %s', e)
            session.rollback()
            continue
    safe_commit(session)
    return created


def seed_product_suppliers(faker, count: int, ctx: Dict[str, Any]) -> List[Any]:
    ProductSupplier = ctx['ProductSupplier']
    session = ctx['session']
    inventories = ctx.get('inventories') or []
    suppliers = ctx.get('suppliers') or []
    created = []
    if not inventories or not suppliers:
        return created
    for _ in range(count):
        prod = random.choice(inventories)
        sup = random.choice(suppliers)
        try:
            ps = ProductSupplier(
                product_id=prod.id,
                supplier_id=sup.id,
                supplier_product_code=faker.unique.bothify('SP-####') if hasattr(faker, 'unique') else faker.bothify('SP-####'),
                supplier_product_name=prod.name,
                unit_cost=round(random.uniform(10.0, float(getattr(prod, 'price', 100.0))), 2),
                currency='TRY',
                minimum_order_quantity=1,
                lead_time_days=random.randint(1, 30),
                is_primary=False
            )
            session.add(ps)
            created.append(ps)
            if len(created) % COMMIT_BATCH == 0:
                safe_commit(session)
        except Exception as e:
            logger.warning('Failed to create product_supplier: %s', e)
            session.rollback()
            continue
    safe_commit(session)
    return created


# --- Orchestration ---
def parse_tables_arg(value: str) -> List[str]:
    if not value or value.strip().lower() == 'all':
        return DEFAULT_TABLES[:]
    parts = [p.strip() for p in value.split(',') if p.strip()]
    return [p for p in parts if p in DEFAULT_TABLES]


def sample_supplier(faker):
    return {
        'company_name': faker.company(),
        'contact_person': faker.name(),
        'email': faker.company_email() if hasattr(faker, 'company_email') else faker.company_email(),
    }


def sample_inventory(faker):
    return {
        'name': faker.word().capitalize() + ' ' + (faker.lexify(text='Model-???') if hasattr(faker, 'lexify') else faker.lexify(text='Model-???')),
        'brand': faker.company(),
        'category': random.choice(['hearing_aid', 'aksesuar', 'pil', 'bakim']),
        'barcode': faker.ean13() if hasattr(faker, 'ean13') else faker.ean13(),
        'price': round(random.uniform(50.0, 25000.0), 2)
    }


def sample_patient(faker):
    return {
        'firstName': faker.first_name(),
        'lastName': faker.last_name(),
        'phone': faker.phone_number(),
        'email': faker.email()
    }


def main():
    parser = argparse.ArgumentParser(description='Seed fake data into development DB (safe, idempotent helpers).')
    parser.add_argument('--count', type=int, default=DEFAULT_COUNT, help='Number of records per table (default: 50)')
    parser.add_argument('--tables', type=str, default='all', help='Comma-separated list of tables to seed or "all"')
    parser.add_argument('--apply', action='store_true', help='Apply changes to DB (default is dry-run)')
    parser.add_argument('--seed', type=int, default=None, help='Seed for deterministic fake data')
    parser.add_argument('--backup-dir', type=str, default=None, help='Optional directory to place DB backups')
    args = parser.parse_args()

    ensure_sys_path()

    faker = get_faker(args.seed)

    tables = parse_tables_arg(args.tables)

    # Resolve sqlite DB path from known instance location
    script_dir = os.path.dirname(__file__)
    db_path_guess = os.path.abspath(os.path.join(script_dir, '..', 'instance', 'xear_crm.db'))
    if not os.path.exists(db_path_guess):
        logger.warning('Expected dev sqlite DB at %s not found; continuing but --apply will fail.', db_path_guess)

    if not args.apply:
        logger.info('Dry-run mode (no writes). Use --apply to persist changes.')
        # Print a short plan and sample data using the faker generator
        for t in tables:
            logger.info('(dry-run) would create %d rows for table: %s', args.count, t)
            # Print small sample
            try:
                if t == 'suppliers':
                    logger.info('  sample: %s', sample_supplier(faker))
                elif t == 'inventories':
                    logger.info('  sample: %s', sample_inventory(faker))
                elif t == 'patients':
                    logger.info('  sample: %s', sample_patient(faker))
            except Exception:
                pass
        return

    # --apply path: create backup and run seeding against the real DB
    try:
        bak = backup_sqlite(db_path_guess, args.backup_dir)
        logger.info('Backup created at: %s', bak)
    except Exception as e:
        logger.error('Failed to create DB backup: %s', e)
        raise

    # Import the Flask app and models inside the app context. To avoid name
    # collisions with a top-level `utils.py` file in the repository root we
    # import `backend.utils` and explicitly register it in sys.modules under
    # the name `utils` so code that does `from utils.rate_limit import ...`
    # resolves to the backend utils package.
    import importlib
    try:
        # Ensure backend package and backend.utils are importable
        importlib.import_module('backend')
        backend_utils_mod = importlib.import_module('backend.utils')
        # Register alias so `import utils` resolves to backend.utils
        sys.modules.setdefault('utils', backend_utils_mod)
    except Exception as e:
        logger.warning('Could not alias backend.utils to utils: %s', e)

    try:
        backend_app_mod = importlib.import_module('backend.app')
        app_obj = getattr(backend_app_mod, 'app')
        # Prefer the SQLAlchemy instance defined in models.base to avoid
        # accidental multiple instances. Import it explicitly and call
        # init_app(app) to ensure the current app is registered.
        try:
            models_base = importlib.import_module('models.base')
            db = getattr(models_base, 'db')
        except Exception:
            db = getattr(backend_app_mod, 'db')
        # Ensure the db instance is initialized with the app
        try:
            if hasattr(db, 'init_app'):
                db.init_app(app_obj)
        except Exception as _e:
            logger.warning('db.init_app(app) raised a warning: %s', _e)
    except Exception as e:
        logger.error('Failed to import backend.app: %s', e)
        raise

    with app_obj.app_context():
        # Import models the same way application modules do (absolute model names)
        from models import (
            Supplier, ProductSupplier, Inventory, Patient, Device, Appointment, Sale,
            DeviceAssignment, PaymentPlan, PaymentInstallment, PaymentRecord, Invoice, Proforma
        )

        # Create a dedicated SQLAlchemy session bound to the app's configured
        # database engine. This avoids depending on the Flask-SQLAlchemy
        # extension instance having been registered in all import paths.
        db_uri = app_obj.config.get('SQLALCHEMY_DATABASE_URI')
        connect_args = {'check_same_thread': False} if db_uri and db_uri.startswith('sqlite') else {}
        engine = create_engine(db_uri, connect_args=connect_args)
        SessionLocal = sessionmaker(bind=engine)
        session = SessionLocal()

        ctx = {
            'db': db,
            'session': session,
            'Supplier': Supplier,
            'ProductSupplier': ProductSupplier,
            'Inventory': Inventory,
            'Patient': Patient,
            'Device': Device,
            'Appointment': Appointment,
            'Sale': Sale,
            'DeviceAssignment': DeviceAssignment,
            'PaymentPlan': PaymentPlan,
            'PaymentInstallment': PaymentInstallment,
            'PaymentRecord': PaymentRecord,
            'Invoice': Invoice,
            'Proforma': Proforma
        }

        # Seed tables in FK-safe order
        created_summary: Dict[str, List[Any]] = {}

        if 'suppliers' in tables:
            logger.info('Seeding suppliers...')
            created_summary['suppliers'] = seed_suppliers(faker, args.count, ctx) if args.apply else []
            if not args.apply:
                logger.info('(dry-run) would create %d suppliers', args.count)

        if 'inventories' in tables:
            logger.info('Seeding inventories...')
            # Use real suppliers (either created in this run or existing DB rows) to enrich inventory
            ctx['suppliers'] = created_summary.get('suppliers') or (Supplier.query.limit(50).all())
            created_summary['inventories'] = seed_inventories(faker, args.count, ctx) if args.apply else []
            if not args.apply:
                logger.info('(dry-run) would create %d inventory items', args.count)

        if 'patients' in tables:
            logger.info('Seeding patients...')
            created_summary['patients'] = seed_patients(faker, args.count, ctx) if args.apply else []
            if not args.apply:
                logger.info('(dry-run) would create %d patients', args.count)

        if 'devices' in tables:
            logger.info('Seeding devices...')
            ctx['inventories'] = created_summary.get('inventories') or Inventory.query.limit(100).all()
            ctx['patients'] = created_summary.get('patients') or Patient.query.limit(100).all()
            created_summary['devices'] = seed_devices(faker, args.count, ctx) if args.apply else []
            if not args.apply:
                logger.info('(dry-run) would create %d devices', args.count)

        if 'appointments' in tables:
            logger.info('Seeding appointments...')
            ctx['patients'] = created_summary.get('patients') or Patient.query.limit(100).all()
            created_summary['appointments'] = seed_appointments(faker, args.count, ctx) if args.apply else []
            if not args.apply:
                logger.info('(dry-run) would create %d appointments', args.count)

        if 'sales' in tables:
            logger.info('Seeding sales...')
            ctx['patients'] = created_summary.get('patients') or Patient.query.limit(200).all()
            ctx['inventories'] = created_summary.get('inventories') or Inventory.query.limit(200).all()
            created_summary['sales'] = seed_sales(faker, args.count, ctx) if args.apply else []
            if not args.apply:
                logger.info('(dry-run) would create %d sales', args.count)

        if 'device_assignments' in tables:
            logger.info('Seeding device assignments...')
            ctx['devices'] = created_summary.get('devices') or Device.query.limit(200).all()
            ctx['sales'] = created_summary.get('sales') or Sale.query.limit(200).all()
            ctx['patients'] = created_summary.get('patients') or Patient.query.limit(200).all()
            created_summary['device_assignments'] = seed_device_assignments(faker, args.count, ctx) if args.apply else []
            if not args.apply:
                logger.info('(dry-run) would create %d device assignments', args.count)

        if 'payment_plans' in tables:
            logger.info('Seeding payment plans & installments...')
            ctx['sales'] = created_summary.get('sales') or Sale.query.limit(200).all()
            if args.apply:
                plans, installs = seed_payment_plans_and_installments(faker, args.count, ctx)
                created_summary['payment_plans'] = plans
                created_summary['payment_installments'] = installs
            else:
                logger.info('(dry-run) would create %d payment plans & installments', args.count)

        if 'payment_records' in tables:
            logger.info('Seeding payment records...')
            ctx['sales'] = created_summary.get('sales') or Sale.query.limit(200).all()
            created_summary['payment_records'] = seed_payment_records(faker, args.count, ctx) if args.apply else []
            if not args.apply:
                logger.info('(dry-run) would create %d payment records', args.count)

        if 'invoices' in tables:
            logger.info('Seeding invoices...')
            ctx['sales'] = created_summary.get('sales') or Sale.query.limit(200).all()
            created_summary['invoices'] = seed_invoices(faker, args.count, ctx) if args.apply else []
            if not args.apply:
                logger.info('(dry-run) would create %d invoices', args.count)

        if 'proformas' in tables:
            logger.info('Seeding proformas...')
            ctx['patients'] = created_summary.get('patients') or Patient.query.limit(200).all()
            created_summary['proformas'] = seed_proformas(faker, args.count, ctx) if args.apply else []
            if not args.apply:
                logger.info('(dry-run) would create %d proformas', args.count)

        if 'product_suppliers' in tables:
            logger.info('Seeding product_suppliers...')
            ctx['inventories'] = created_summary.get('inventories') or Inventory.query.limit(200).all()
            ctx['suppliers'] = created_summary.get('suppliers') or Supplier.query.limit(200).all()
            created_summary['product_suppliers'] = seed_product_suppliers(faker, args.count, ctx) if args.apply else []
            if not args.apply:
                logger.info('(dry-run) would create %d product_suppliers', args.count)

        # Final summary
        logger.info('\nSeeding finished (applied=%s). Summary:', args.apply)
        for k in tables:
            created_list = created_summary.get(k, [])
            logger.info('  %s: %d created', k, len(created_list) if isinstance(created_list, list) else 0)


if __name__ == '__main__':
    main()
