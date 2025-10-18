#!/usr/bin/env python3
"""
Script to add 50 sample inventory records to the database using SQLAlchemy
"""

import sys
import os
from decimal import Decimal
import random
import json
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the Flask app instance directly
import app
from models.inventory import Inventory
from models.base import db

def create_sample_inventory_data():
    """Create 50 sample inventory records"""
    
    # Sample data for different categories
    hearing_aids = [
        {"name": "Phonak Audéo Paradise P90", "brand": "Phonak", "category": "İşitme Cihazı"},
        {"name": "Oticon More 1", "brand": "Oticon", "category": "İşitme Cihazı"},
        {"name": "Widex Moment 440", "brand": "Widex", "category": "İşitme Cihazı"},
        {"name": "Signia Pure Charge&Go X", "brand": "Signia", "category": "İşitme Cihazı"},
        {"name": "ReSound ONE 9", "brand": "ReSound", "category": "İşitme Cihazı"},
        {"name": "Starkey Livio Edge AI", "brand": "Starkey", "category": "İşitme Cihazı"},
        {"name": "Bernafon Alpha 9", "brand": "Bernafon", "category": "İşitme Cihazı"},
        {"name": "Unitron Moxi Blue", "brand": "Unitron", "category": "İşitme Cihazı"},
    ]
    
    batteries = [
        {"name": "Pil 10 (Sarı)", "brand": "Rayovac", "category": "Pil"},
        {"name": "Pil 13 (Turuncu)", "brand": "Duracell", "category": "Pil"},
        {"name": "Pil 312 (Kahverengi)", "brand": "PowerOne", "category": "Pil"},
        {"name": "Pil 675 (Mavi)", "brand": "Energizer", "category": "Pil"},
        {"name": "Şarjlı Pil Paketi", "brand": "Phonak", "category": "Pil"},
    ]
    
    accessories = [
        {"name": "Kulak Kalıbı Silikon", "brand": "Generic", "category": "Aksesuar"},
        {"name": "Wax Guard Filtresi", "brand": "Phonak", "category": "Aksesuar"},
        {"name": "Dome Başlığı Kapalı", "brand": "Oticon", "category": "Aksesuar"},
        {"name": "Dome Başlığı Açık", "brand": "Widex", "category": "Aksesuar"},
        {"name": "Temizlik Kiti", "brand": "Generic", "category": "Aksesuar"},
        {"name": "Nem Alma Kutusu", "brand": "Generic", "category": "Aksesuar"},
        {"name": "Bluetooth Streamer", "brand": "Signia", "category": "Aksesuar"},
        {"name": "TV Connector", "brand": "ReSound", "category": "Aksesuar"},
        {"name": "Mikrofon Kılıfı", "brand": "Starkey", "category": "Aksesuar"},
    ]
    
    supplies = [
        {"name": "Kulak Muayene Speculum", "brand": "Medical", "category": "Malzeme"},
        {"name": "Otoskop Başlığı", "brand": "Welch Allyn", "category": "Malzeme"},
        {"name": "Timpanometre Probu", "brand": "Interacoustics", "category": "Malzeme"},
        {"name": "Audiometre Kulaklığı", "brand": "Sennheiser", "category": "Malzeme"},
        {"name": "Kalibrasyon Kiti", "brand": "Bruel & Kjaer", "category": "Malzeme"},
    ]
    
    # Combine all products
    all_products = hearing_aids + batteries + accessories + supplies
    
    # Extend the list to have at least 50 items by repeating some items with variations
    extended_products = []
    for i, product in enumerate(all_products):
        extended_products.append(product)
        
        # Add variations for some products
        if len(extended_products) < 50:
            if product["category"] == "İşitme Cihazı":
                # Add left/right variations
                left_variant = product.copy()
                left_variant["name"] = f"{product['name']} (Sol)"
                extended_products.append(left_variant)
                
                if len(extended_products) < 50:
                    right_variant = product.copy()
                    right_variant["name"] = f"{product['name']} (Sağ)"
                    extended_products.append(right_variant)
            
            elif product["category"] == "Pil":
                # Add different pack sizes
                if len(extended_products) < 50:
                    bulk_variant = product.copy()
                    bulk_variant["name"] = f"{product['name']} - 60'lı Paket"
                    extended_products.append(bulk_variant)
    
    # Take exactly 50 products
    products_to_add = extended_products[:50]
    
    inventory_records = []
    
    for i, product_data in enumerate(products_to_add, 1):
        # Generate realistic inventory data
        is_hearing_aid = product_data["category"] == "İşitme Cihazı"
        
        # Set inventory levels based on product type
        if is_hearing_aid:
            available_inventory = random.randint(1, 5)
            total_inventory = available_inventory + random.randint(0, 2)
            reorder_level = 2
            price = Decimal(str(random.randint(15000, 45000)))  # 15,000 - 45,000 TL
        elif product_data["category"] == "Pil":
            available_inventory = random.randint(50, 200)
            total_inventory = available_inventory + random.randint(0, 50)
            reorder_level = 20
            price = Decimal(str(random.randint(5, 25)))  # 5 - 25 TL
        else:  # Accessories and supplies
            available_inventory = random.randint(10, 50)
            total_inventory = available_inventory + random.randint(0, 20)
            reorder_level = 5
            price = Decimal(str(random.randint(50, 500)))  # 50 - 500 TL
        
        # Create inventory record
        inventory = Inventory(
            name=product_data["name"],
            brand=product_data["brand"],
            category=product_data["category"],
            available_inventory=available_inventory,
            total_inventory=total_inventory,
            reorder_level=reorder_level,
            price=float(price),  # Convert Decimal to float
            warranty=24 if is_hearing_aid else 12,  # 24 months for hearing aids, 12 for others
            barcode=f"8690{str(i).zfill(8)}",  # Generate barcode
            available_serials=json.dumps([f"SN{str(i).zfill(6)}{j}" for j in range(available_inventory)]) if is_hearing_aid else None,
            supplier="Tedarikçi A" if i % 3 == 0 else "Tedarikçi B" if i % 3 == 1 else "Tedarikçi C",
            description=f"{product_data['name']} - {product_data['brand']} marka kaliteli ürün"
        )
        
        inventory_records.append(inventory)
    
    return inventory_records

def main():
    """Main function to add inventory data"""
    
    with app.app.app_context():
        try:
            print("50 adet inventory kaydı ekleniyor...")
            
            # Create sample inventory data
            inventory_records = create_sample_inventory_data()
            
            # Add records to database one by one
            for i, inventory in enumerate(inventory_records, 1):
                try:
                    db.session.add(inventory)
                    db.session.flush()  # Flush to get any immediate errors
                    print(f"{i:2d}. {inventory.name} - {inventory.brand} ({inventory.category})")
                except Exception as e:
                    print(f"❌ Hata (kayıt {i}): {str(e)}")
                    db.session.rollback()
                    continue
            
            # Commit all changes
            db.session.commit()
            
            print(f"\n✅ Başarıyla {len(inventory_records)} adet inventory kaydı eklendi!")
            print("\nEklenen kategoriler:")
            categories = {}
            for inv in inventory_records:
                categories[inv.category] = categories.get(inv.category, 0) + 1
            
            for category, count in categories.items():
                print(f"  - {category}: {count} adet")
                
        except Exception as e:
            print(f"❌ Hata oluştu: {str(e)}")
            db.session.rollback()
            return 1
    
    return 0

if __name__ == "__main__":
    exit(main())