"""
Migration: Add promissory_notes table and paid_amount to sales
Date: 2025-10-03
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from models.base import db

def run_migration():
    """Run migration to add promissory_notes table and update sales table"""
    
    app = Flask(__name__)
    # Use the correct path to instance folder
    instance_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', 'instance')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(instance_path, "xear.db")}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    print(f"📂 Using database: {app.config['SQLALCHEMY_DATABASE_URI']}")
    
    db.init_app(app)
    
    with app.app_context():
        # Check if tables already exist
        inspector = db.inspect(db.engine)
        existing_tables = inspector.get_table_names()
        
        print("🔍 Checking database state...")
        
        # Add paid_amount to sales table if it doesn't exist
        if 'sales' in existing_tables:
            columns = [col['name'] for col in inspector.get_columns('sales')]
            if 'paid_amount' not in columns:
                print("➕ Adding paid_amount column to sales table...")
                with db.engine.connect() as conn:
                    conn.execute(db.text('''
                        ALTER TABLE sales 
                        ADD COLUMN paid_amount NUMERIC(12, 2) DEFAULT 0.0
                    '''))
                    conn.commit()
                print("✅ Added paid_amount column to sales")
            else:
                print("✓ paid_amount column already exists in sales")
        
        # Create promissory_notes table if it doesn't exist
        if 'promissory_notes' not in existing_tables:
            print("➕ Creating promissory_notes table...")
            with db.engine.connect() as conn:
                conn.execute(db.text('''
                    CREATE TABLE promissory_notes (
                        id VARCHAR(50) PRIMARY KEY,
                        patient_id VARCHAR(50) NOT NULL,
                        sale_id VARCHAR(50),
                        note_number INTEGER NOT NULL,
                        total_notes INTEGER NOT NULL,
                        amount NUMERIC(12, 2) NOT NULL,
                        total_amount NUMERIC(12, 2) NOT NULL,
                        issue_date DATETIME NOT NULL,
                        due_date DATETIME NOT NULL,
                        status VARCHAR(20) DEFAULT 'active',
                        paid_date DATETIME,
                        debtor_name VARCHAR(200) NOT NULL,
                        debtor_tc VARCHAR(11),
                        debtor_address TEXT,
                        debtor_tax_office VARCHAR(100),
                        debtor_phone VARCHAR(20),
                        has_guarantor BOOLEAN DEFAULT 0,
                        guarantor_name VARCHAR(200),
                        guarantor_tc VARCHAR(11),
                        guarantor_address TEXT,
                        guarantor_phone VARCHAR(20),
                        authorized_court VARCHAR(200) DEFAULT 'İstanbul (Çağlayan)',
                        document_id VARCHAR(50),
                        file_name VARCHAR(255),
                        notes TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (patient_id) REFERENCES patients(id),
                        FOREIGN KEY (sale_id) REFERENCES sales(id)
                    )
                '''))
                conn.commit()
            
            # Create indexes
            print("➕ Creating indexes for promissory_notes...")
            with db.engine.connect() as conn:
                conn.execute(db.text('CREATE INDEX ix_promissory_note_patient ON promissory_notes(patient_id)'))
                conn.execute(db.text('CREATE INDEX ix_promissory_note_sale ON promissory_notes(sale_id)'))
                conn.execute(db.text('CREATE INDEX ix_promissory_note_status ON promissory_notes(status)'))
                conn.execute(db.text('CREATE INDEX ix_promissory_note_due_date ON promissory_notes(due_date)'))
                conn.commit()
            
            print("✅ Created promissory_notes table with indexes")
        else:
            print("✓ promissory_notes table already exists")
        
        print("\n✅ Migration completed successfully!")
        print("\nNew features:")
        print("  • Promissory notes can now be stored in database")
        print("  • Sales now track paid_amount for partial payments")
        print("  • Promissory notes can be linked to specific sales")

if __name__ == '__main__':
    print("=" * 60)
    print("MIGRATION: Add Promissory Notes and Paid Amount")
    print("=" * 60)
    print()
    
    try:
        run_migration()
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
