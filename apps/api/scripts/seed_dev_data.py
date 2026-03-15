"""Seed canonical DB with tenants, users, and UTS settings for dev/test."""
import os, sys, uuid, json
from datetime import datetime, timezone

# Ensure we can import from the api package
API_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # scripts/ -> api/
sys.path.insert(0, API_DIR)
os.chdir(API_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(API_DIR, ".env"))

from database import engine, SessionLocal, Base, gen_id
from core.models.tenant import Tenant
from core.models.user import User

# ── Create tables if missing ─────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    # ── 1. Tenants ────────────────────────────────────────────────────────────
    test_env = {
        "UTS_TEST_TOKEN": os.getenv("UTS_TEST_TOKEN", ""),
        "UTS_TEST_BASE_URL": os.getenv("UTS_TEST_BASE_URL", "https://utstest.saglik.gov.tr/UTS"),
        "UTS_TEST_COMPANY_CODE": os.getenv("UTS_TEST_COMPANY_CODE", "266726929177"),
        "UTS_TEST_MEMBER_NUMBER": os.getenv("UTS_TEST_MEMBER_NUMBER", "266726929177"),
    }
    prod_env = {
        "UTS_PROD_TOKEN": os.getenv("UTS_PROD_TOKEN", ""),
        "UTS_PROD_BASE_URL": os.getenv("UTS_PROD_BASE_URL", "https://utsuygulama.saglik.gov.tr/UTS"),
        "UTS_PROD_COMPANY_CODE": os.getenv("UTS_PROD_COMPANY_CODE", "2667269774531"),
        "UTS_PROD_MEMBER_NUMBER": os.getenv("UTS_PROD_MEMBER_NUMBER", "2667269055837"),
    }

    now = datetime.now(timezone.utc)

    tenants_data = [
        {
            "id": str(uuid.uuid4()),
            "name": "Deneme Kliniği",
            "slug": "deneme",
            "status": "active",
            "owner_email": "omerozmen4903@gmail.com",
            "billing_email": "omerozmen4903@gmail.com",
            "max_users": 10,
            "current_users": 1,
            "max_branches": 3,
            "current_branches": 1,
            "created_at": now,
            "updated_at": now,
            "settings": {
                "uts_integration": {
                    "enabled": True,
                    "environment": "test",
                    "auth_scheme": "uts_token",
                    "token": test_env["UTS_TEST_TOKEN"],
                    "company_code": test_env["UTS_TEST_COMPANY_CODE"],
                    "member_number": test_env["UTS_TEST_MEMBER_NUMBER"],
                    "auto_send_notifications": False,
                    "notification_mode": "manual",
                    "serial_states": {},
                }
            },
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Helix İşitme Cihazları - Düzce",
            "slug": "helix-duzce",
            "status": "active",
            "owner_email": "duzcehelix@gmail.com",
            "billing_email": "duzcehelix@gmail.com",
            "max_users": 10,
            "current_users": 1,
            "max_branches": 3,
            "current_branches": 1,
            "created_at": now,
            "updated_at": now,
            "settings": {
                "uts_integration": {
                    "enabled": True,
                    "environment": "prod",
                    "auth_scheme": "uts_token",
                    "token": prod_env["UTS_PROD_TOKEN"],
                    "company_code": prod_env["UTS_PROD_COMPANY_CODE"],
                    "member_number": prod_env["UTS_PROD_MEMBER_NUMBER"],
                    "auto_send_notifications": False,
                    "notification_mode": "manual",
                    "serial_states": {},
                }
            },
        },
    ]

    created_tenants = {}
    for td in tenants_data:
        existing = db.query(Tenant).filter_by(slug=td["slug"]).first()
        if existing:
            print(f"  Tenant '{td['slug']}' already exists (id={existing.id})")
            created_tenants[td["slug"]] = existing.id
            continue
        t = Tenant(**td)
        db.add(t)
        created_tenants[td["slug"]] = td["id"]
        print(f"  Created tenant '{td['slug']}' (id={td['id']})")

    db.flush()

    # ── 2. Users ──────────────────────────────────────────────────────────────
    users_data = [
        {
            "email": "omerozmen4903@gmail.com",
            "username": "ozmen",
            "first_name": "Ömer",
            "last_name": "Özmen",
            "role": "ADMIN",
            "password": "Helix2024!",
            "tenant_slug": "deneme",
        },
        {
            "email": "duzcehelix@gmail.com",
            "username": "helix",
            "first_name": "Helix",
            "last_name": "Düzce",
            "role": "ADMIN",
            "password": "Helix2024!",
            "tenant_slug": "helix-duzce",
        },
        {
            "email": "admin@xear.com",
            "username": "admin",
            "first_name": "Admin",
            "last_name": "User",
            "role": "ADMIN",
            "password": "Admin123!",
            "tenant_slug": "deneme",
        },
    ]

    for ud in users_data:
        existing = db.query(User).filter_by(email=ud["email"]).first()
        if existing:
            print(f"  User '{ud['email']}' already exists")
            continue
        tenant_slug = ud.pop("tenant_slug")
        tenant_id = created_tenants.get(tenant_slug)
        pwd = ud.pop("password")
        u = User(
            id=f"usr_{uuid.uuid4().hex[:12]}",
            tenant_id=tenant_id,
            is_active=True,
            **ud,
        )
        u.set_password(pwd)
        db.add(u)
        print(f"  Created user '{ud['email']}' -> tenant={tenant_id}")

    db.flush()

    # ── 3. Inventory + devices for UTS testing ───────────────────────────────
    from core.models.inventory import InventoryItem
    from core.models.device import Device

    deneme_tid = created_tenants["deneme"]

    products = [
        {"name": "Phonak Audéo P90-R", "barcode": "7611976000011", "brand": "Phonak", "serial": "SN-PH-001", "stock_code": "STK-PH001"},
        {"name": "Oticon More 1", "barcode": "5702663100014", "brand": "Oticon", "serial": "SN-OT-002", "stock_code": "STK-OT002"},
        {"name": "ReSound ONE 961", "barcode": "5706228880011", "brand": "ReSound", "serial": "SN-RS-003", "stock_code": "STK-RS003"},
        {"name": "Widex Moment 440", "barcode": "5703289000018", "brand": "Widex", "serial": "SN-WX-004", "stock_code": "STK-WX004"},
        {"name": "Signia AX Pure C&G", "barcode": "4043752300017", "brand": "Signia", "serial": "SN-SG-005", "stock_code": "STK-SG005"},
    ]

    for p in products:
        existing = db.query(InventoryItem).filter_by(barcode=p["barcode"], tenant_id=deneme_tid).first()
        if existing:
            print(f"  Inventory '{p['name']}' already exists")
            continue

        inv_id = gen_id("item")
        inv = InventoryItem(
            id=inv_id,
            tenant_id=deneme_tid,
            name=p["name"],
            barcode=p["barcode"],
            stock_code=p["stock_code"],
            brand=p["brand"],
            category="hearing_aid",
            available_inventory=5,
            total_inventory=5,
            used_inventory=0,
            price=25000.0,
            cost=18000.0,
            available_serials=json.dumps([p["serial"]]),
        )
        db.add(inv)

        dev = Device(
            id=gen_id("dev"),
            tenant_id=deneme_tid,
            inventory_id=inv_id,
            serial_number=p["serial"],
            brand=p["brand"],
            model=p["name"],
            status="IN_STOCK",
            category="HEARING_AID",
        )
        db.add(dev)
        print(f"  Created inventory '{p['name']}' + device serial={p['serial']}")

    db.commit()
    print("\n=== Seed complete ===")
    print(f"  Tenants: {db.query(Tenant).count()}")
    print(f"  Users: {db.query(User).count()}")
    print(f"  Inventory: {db.query(InventoryItem).count()}")
    print(f"  Devices: {db.query(Device).count()}")

except Exception as e:
    db.rollback()
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
