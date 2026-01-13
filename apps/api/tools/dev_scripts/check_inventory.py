#!/usr/bin/env python3
"""
Check inventory database status
"""
import sys
import os
# Add backend root to path to allow imports from app, models, etc.
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from app import app
from models import db, Inventory
from sqlalchemy import inspect

def check_inventory():
    with app.app_context():
        try:
            # Check if table exists using inspector
            inspector = inspect(db.engine)
            table_exists = 'inventory' in inspector.get_table_names()
            print(f"Inventory table exists: {table_exists}")
            
            if table_exists:
                # Count total items
                total_items = Inventory.query.count()
                print(f"Total inventory items: {total_items}")
                
                # Get first few items
                items = Inventory.query.limit(5).all()
                print(f"First 5 items:")
                for item in items:
                    print(f"  - {item.id}: {item.name} ({item.brand} {item.model})")
            else:
                print("Inventory table does not exist!")
                print("Creating tables...")
                db.create_all()
                print("Tables created!")
                
        except Exception as e:
            print(f"Error checking inventory: {e}")

if __name__ == "__main__":
    check_inventory()