#!/usr/bin/env python3
"""
Migration script to add invoices and proformas tables
Run this to add the new tables to existing database
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import db, Invoice, Proforma
from flask import Flask

# Initialize Flask app
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.abspath(
    os.path.join(os.path.dirname(__file__), 'instance', 'xear_crm.db')
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize db with app
db.init_app(app)

def create_invoice_tables():
    """Create invoices and proformas tables"""
    with app.app_context():
        print("Creating invoices and proformas tables...")
        
        # Create tables
        db.create_all()
        
        print("✓ Tables created successfully!")
        print("  - invoices")
        print("  - proformas")
        
        # Verify tables exist
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        
        if 'invoices' in tables and 'proformas' in tables:
            print("\n✓ Migration successful!")
            return True
        else:
            print("\n✗ Migration failed - tables not found")
            return False

if __name__ == '__main__':
    success = create_invoice_tables()
    sys.exit(0 if success else 1)
