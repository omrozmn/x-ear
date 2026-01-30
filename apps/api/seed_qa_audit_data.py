#!/usr/bin/env python3
import sys
import os
from uuid import uuid4

# Add backend to path
backend_dir = "/Users/omerozmen/Desktop/x-ear web app/x-ear/apps/api"
sys.path.insert(0, backend_dir)

from database import SessionLocal
from core.models.party import Party
from core.models.suppliers import Supplier
from core.models.user import User
from core.models.tenant import Tenant
from core.models.enums import PatientStatus
from werkzeug.security import generate_password_hash

def seed_qa_data():
    db = SessionLocal()
    tenant_id = "tenant-1"
    
    try:
        print(f"Seeding QA data for {tenant_id}...")
        
        # 0. Seed Tenant
        existing_tenant = db.query(Tenant).filter_by(id=tenant_id).first()
        if not existing_tenant:
            tenant = Tenant(
                id=tenant_id,
                name="QA Test Tenant",
                slug="qa-test",
                status="active",
                owner_email="qa_admin@x-ear.com",
                billing_email="qa_admin@x-ear.com",
                product_code="xear_hearing"
            )
            db.add(tenant)
            print(f"✅ Seeded Tenant: {tenant_id}")
        else:
            print(f"ℹ️ Tenant {tenant_id} already exists.")

        # 1. Seed Party
        party_email = "qa_test_party@example.com"
        existing_party = db.query(Party).filter_by(email=party_email, tenant_id=tenant_id).first()
        if not existing_party:
            party = Party(
                id="pat_QA_TEST_SEED",
                tenant_id=tenant_id,
                first_name="QA_TEST_SEED",
                last_name="PARTY",
                phone="05001112233",
                email=party_email,
                tc_number="12345678950",
                status=PatientStatus.ACTIVE,
                segment="VIP"
            )
            db.add(party)
            print("✅ Seeded Party: QA_TEST_SEED PARTY")
        else:
            print("ℹ️ Party already exists.")

        # 2. Seed Supplier
        supplier_code = "SUP_QA_TEST"
        existing_supplier = db.query(Supplier).filter_by(company_code=supplier_code, tenant_id=tenant_id).first()
        if not existing_supplier:
            supplier = Supplier(
                tenant_id=tenant_id,
                company_name="QA_TEST_SEED SUPPLIER",
                company_code=supplier_code,
                contact_person="QA OWNER",
                email="qa_test_supplier@example.com",
                phone="05009998877",
                currency="TRY"
            )
            db.add(supplier)
            print("✅ Seeded Supplier: QA_TEST_SEED SUPPLIER")
        else:
            print("ℹ️ Supplier already exists.")

        # 3. Seed Test User
        user_email = "qa_admin@x-ear.com"
        existing_user = db.query(User).filter_by(email=user_email).first()
        if existing_user:
            db.delete(existing_user)
            db.commit()
            print(f"Cleaned up existing user: {user_email}")

        user = User(
            id="usr_QA_ADMIN",
            tenant_id=tenant_id,
            username="qa_admin",
            email=user_email,
            phone="05001112233",
            first_name="QA",
            last_name="Admin",
            role="tenant_admin",
            is_active=True,
            is_phone_verified=True,
            password_hash=generate_password_hash("password123", method="pbkdf2:sha256")
        )
        db.add(user)
        print(f"✅ Seeded User: {user_email}")

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding QA data: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_qa_data()
