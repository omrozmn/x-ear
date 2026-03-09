#!/usr/bin/env python3
"""Test flag_modified for JSON fields"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.orm.attributes import flag_modified
from core.models.tenant import Tenant

# Create engine
DATABASE_URL = "sqlite:///instance/xear_crm.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def test_flag_modified():
    print("=== Testing flag_modified for Tenant.settings ===\n")
    
    db = SessionLocal()
    
    try:
        # Get first tenant
        tenant = db.query(Tenant).first()
        if not tenant:
            print("❌ No tenant found in database")
            return False
        
        print(f"✅ Found tenant: {tenant.id} - {tenant.name}")
        print(f"   Current settings: {tenant.settings}\n")
        
        # Test 1: Update without flag_modified (should NOT persist)
        print("Test 1: Update WITHOUT flag_modified...")
        original_settings = tenant.settings or {}
        tenant.settings = {**original_settings, "test_without_flag": "should_not_persist"}
        db.commit()
        db.refresh(tenant)
        
        if "test_without_flag" in (tenant.settings or {}):
            print("   ⚠️  Change persisted (unexpected - SQLAlchemy might be tracking)")
        else:
            print("   ✅ Change NOT persisted (expected)")
        
        # Test 2: Update WITH flag_modified (should persist)
        print("\nTest 2: Update WITH flag_modified...")
        tenant.settings = {**original_settings, "test_with_flag": "should_persist"}
        flag_modified(tenant, "settings")
        db.commit()
        db.refresh(tenant)
        
        if "test_with_flag" in (tenant.settings or {}):
            print("   ✅ Change persisted (expected)")
        else:
            print("   ❌ Change NOT persisted (unexpected)")
        
        # Test 3: Deep merge with flag_modified
        print("\nTest 3: Deep merge WITH flag_modified...")
        current = tenant.settings or {}
        current["invoice_integration"] = {
            "invoice_prefix": "XER",
            "invoice_prefixes": ["XER", "TST", "ABC"]
        }
        tenant.settings = current
        flag_modified(tenant, "settings")
        db.commit()
        db.refresh(tenant)
        
        invoice_settings = (tenant.settings or {}).get("invoice_integration", {})
        print(f"   invoice_prefix: {invoice_settings.get('invoice_prefix')}")
        print(f"   invoice_prefixes: {invoice_settings.get('invoice_prefixes')}")
        
        if invoice_settings.get("invoice_prefix") == "XER":
            print("   ✅ Deep merge persisted (expected)")
        else:
            print("   ❌ Deep merge NOT persisted (unexpected)")
        
        # Cleanup
        print("\nCleaning up test data...")
        if tenant.settings:
            tenant.settings.pop("test_without_flag", None)
            tenant.settings.pop("test_with_flag", None)
            flag_modified(tenant, "settings")
            db.commit()
        
        print("✅ Test completed!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = test_flag_modified()
    sys.exit(0 if success else 1)
