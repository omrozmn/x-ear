#!/usr/bin/env python3
"""
Migration script to add invoices and proformas tables
Run this to add the new tables to existing database
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models.invoice import Invoice
from models.proforma import Proforma

def create_invoice_tables():
    """Create invoices and proformas tables"""
    print("Creating invoices and proformas tables...")

    from database import engine
    from sqlalchemy import inspect

    # Create tables via SQLAlchemy metadata
    Invoice.__table__.create(bind=engine, checkfirst=True)
    Proforma.__table__.create(bind=engine, checkfirst=True)

    print("✓ Tables created successfully!")
    print("  - invoices")
    print("  - proformas")

    inspector = inspect(engine)
    tables = inspector.get_table_names()

    if 'invoices' in tables and 'proformas' in tables:
        print("\n✓ Migration successful!")
        return True

    print("\n✗ Migration failed - tables not found")
    return False

if __name__ == '__main__':
    success = create_invoice_tables()
    sys.exit(0 if success else 1)
