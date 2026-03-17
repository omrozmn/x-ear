#!/usr/bin/env python3
"""
Quick script to create test inventory items
"""
import os
import sys
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.models import InventoryItem

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./instance/xear_crm.db")
print(f"🔧 Using database: {DATABASE_URL}")

# Create engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_inventory():
    """Create test inventory items."""
    db = SessionLocal()
    
    try:
        print("\n🎧 Creating inventory items...")
        
        # Check if inventory already exists
        existing = db.query(InventoryItem).first()
        if existing:
            print(f"✅ Inventory already exists: {existing.name}")
            return
        
        # Create a simple hearing aid
        inventory = InventoryItem(
            id="inv_test_001",
            name="Phonak Audéo Paradise P90",
            brand="Phonak",
            model="Audéo Paradise P90",
            category="hearing_aid",
            stock_code="PH-P90-001",
            barcode="7612345678901",
            price=45000.00,
            cost=30000.00,
            kdv_rate=20.0,
            available_inventory=5,
            total_inventory=5,
            unit="adet",
            tenant_id="tenant_001",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(inventory)
        db.commit()
        
        print(f"✅ Created inventory: {inventory.name}")
        print(f"   ID: {inventory.id}")
        print(f"   Price: {inventory.price} TL")
        print(f"   Stock: {inventory.available_inventory}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_inventory()
