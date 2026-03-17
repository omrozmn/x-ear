#!/usr/bin/env python3
"""
Seed fake incoming invoices for testing.

Creates realistic incoming invoice records linked to existing suppliers
in the test tenant's database.

Usage:
    cd apps/backend
    python scripts/seed_incoming_invoices.py
"""

import os
import sys
import random
from datetime import datetime, timedelta
from pathlib import Path
from decimal import Decimal

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.models.invoice import Invoice
from core.models.suppliers import Supplier
from core.models.tenant import Tenant
import uuid


# Turkish supplier names as fallback if no suppliers exist in DB
FALLBACK_SUPPLIERS = [
    "ABC Medikal Ltd. Şti.",
    "Phonak Türkiye A.Ş.",
    "Signia İşitme Cihazları",
    "Oticon Audiology",
    "Widex Türkiye",
    "GN ReSound Distribütörlük",
    "Starkey İşitme Teknolojileri",
    "Bernafon Medikal",
    "Unitron Hearing",
    "Sonic İşitme Çözümleri",
]

EDOCUMENT_TYPES = ["EFATURA", "EARSIV"]
EDOCUMENT_STATUSES = ["approved", "pending", "draft"]
PROFILE_IDS = ["TEMELFATURA", "TICARIFATURA"]
INVOICE_TYPE_CODES = ["SATIS", "IADE"]

TAX_OFFICES = [
    "Beyoğlu V.D.", "Kadıköy V.D.", "Üsküdar V.D.",
    "Şişli V.D.", "Beşiktaş V.D.", "Ankara V.D.",
    "İzmir V.D.", "Bursa V.D.", "Mecidiyeköy V.D.",
    "Bakırköy V.D.",
]

DEVICE_NAMES = [
    "Phonak Audéo Paradise P90-R",
    "Signia Pure Charge&Go 7AX",
    "Oticon More 1 miniRITE R",
    "Widex Moment Sheer 440 sRIC",
    "ReSound ONE 9 M&RIE",
    "Starkey Evolv AI 2400 RIC R",
    "Phonak Naída L-UP",
    "Signia Styletto 5AX",
    "Oticon Real 1 miniRITE R",
    "Widex SmartRIC 330",
]


def seed_incoming_invoices(count: int = 15):
    """Seed fake incoming invoices."""

    db_path = Path(__file__).parent.parent / "instance" / "xear_crm.db"
    database_url = os.getenv("DATABASE_URL", f"sqlite:///{db_path}")

    print(f"📄 Seeding {count} incoming invoices to: {database_url}")

    engine = create_engine(database_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # Find the target tenant - prefer "deneme" or accept --tenant-id arg
        target_tenant = None
        
        # Check command-line tenant ID
        tenant_id_arg = sys.argv[2] if len(sys.argv) > 2 else None
        
        if tenant_id_arg:
            target_tenant = db.query(Tenant).filter(Tenant.id == tenant_id_arg).first()
            if not target_tenant:
                print(f"  ❌ Tenant ID '{tenant_id_arg}' not found!")
                return
        else:
            # Search by name containing 'deneme'
            target_tenant = db.query(Tenant).filter(Tenant.name.ilike('%deneme%')).first()
            
            if not target_tenant:
                # Fall back to first active/trial non-test tenant
                target_tenant = db.query(Tenant).filter(
                    Tenant.status.in_(['active', 'trial']),
                    ~Tenant.slug.like('vcorp%'),
                    ~Tenant.slug.like('test-clinic%'),
                ).first()

        if not target_tenant:
            print("  ❌ No suitable tenant found! Pass tenant ID: python seed_incoming_invoices.py 15 <tenant-id>")
            return

        tenant_id = target_tenant.id
        tenant_name = target_tenant.name
        print(f"  Using tenant: {tenant_name} (ID: {tenant_id})")

        # Get existing suppliers for the tenant
        suppliers = db.query(Supplier).filter(
            Supplier.is_active == True,
            Supplier.tenant_id == tenant_id
        ).all()
        
        # If no suppliers for this tenant, try all suppliers
        if not suppliers:
            suppliers = db.query(Supplier).filter(Supplier.is_active == True).all()
        
        supplier_names = [s.company_name for s in suppliers] if suppliers else FALLBACK_SUPPLIERS
        supplier_tax_offices = {s.company_name: s.tax_office for s in suppliers} if suppliers else {}

        print(f"  Found {len(supplier_names)} supplier(s) to use")

        created = 0
        for i in range(count):
            # Random date in last 60 days
            days_ago = random.randint(0, 60)
            issue_date = datetime.now() - timedelta(days=days_ago)

            supplier_name = random.choice(supplier_names)
            device_name = random.choice(DEVICE_NAMES)
            price = Decimal(str(random.randint(2000, 25000)))
            inv_number = f"GFT-{issue_date.strftime('%Y%m')}-{random.randint(1000, 9999)}"

            # Check uniqueness
            existing = db.query(Invoice).filter(Invoice.invoice_number == inv_number).first()
            if existing:
                continue

            tax_office = supplier_tax_offices.get(supplier_name) or random.choice(TAX_OFFICES)
            edoc_status = random.choice(EDOCUMENT_STATUSES)

            invoice = Invoice(
                invoice_number=inv_number,
                tenant_id=tenant_id,
                device_name=device_name,
                device_price=price,
                patient_name=supplier_name,  # Used as partyName in frontend
                issue_date=issue_date,
                created_at=issue_date,
                updated_at=issue_date,
                status="active",
                edocument_status=edoc_status,
                edocument_type=random.choice(EDOCUMENT_TYPES),
                profile_id=random.choice(PROFILE_IDS),
                invoice_type_code="SATIS",
                tax_office=tax_office,
                ettn=str(uuid.uuid4()),
                notes=f"Test gelen fatura - {supplier_name}",
            )

            db.add(invoice)
            created += 1

        db.commit()
        print(f"✅ Created {created} incoming invoices successfully!")

        # Print summary
        total = db.query(Invoice).filter(Invoice.tenant_id == tenant_id).count()
        print(f"  Total invoices for tenant: {total}")

    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 15
    seed_incoming_invoices(count)
