#!/usr/bin/env python3
"""
Script to clean up placeholder inventory items from the database.
These were created when adding new categories/brands but are no longer needed.
"""

import sys
import os
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from models.base import db
from models.inventory import Inventory

# Import the Flask app directly
import sys
sys.path.append('/Users/omerozmen/Desktop/x-ear web app/backend')
from app import app

def cleanup_placeholders():
    """Remove all placeholder inventory items from the database."""
    
    with app.app_context():
        try:
            # Find all placeholder items
            brand_placeholders = db.session.query(Inventory).filter(
                Inventory.name.like('_BRAND_PLACEHOLDER_%')
            ).all()
            
            category_placeholders = db.session.query(Inventory).filter(
                Inventory.name.like('_CATEGORY_PLACEHOLDER_%')
            ).all()
            
            total_placeholders = len(brand_placeholders) + len(category_placeholders)
            
            if total_placeholders == 0:
                print("✅ No placeholder items found in the database.")
                return
            
            print(f"🔍 Found {len(brand_placeholders)} brand placeholders")
            print(f"🔍 Found {len(category_placeholders)} category placeholders")
            print(f"🗑️  Total placeholders to remove: {total_placeholders}")
            
            # Show what will be deleted
            for item in brand_placeholders + category_placeholders:
                print(f"   - {item.name} (ID: {item.id})")
            
            # Confirm deletion
            response = input("\n❓ Do you want to delete these placeholder items? (y/N): ")
            if response.lower() != 'y':
                print("❌ Operation cancelled.")
                return
            
            # Delete placeholders
            for item in brand_placeholders + category_placeholders:
                db.session.delete(item)
            
            db.session.commit()
            print(f"✅ Successfully removed {total_placeholders} placeholder items from the database.")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error cleaning up placeholders: {str(e)}")
            return False
    
    return True

if __name__ == "__main__":
    cleanup_placeholders()