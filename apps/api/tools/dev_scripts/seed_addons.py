import sys
import os
# Add backend root to path to allow imports from app, models, etc.
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
from models.base import db
from models.addon import AddOn, AddOnType

def seed_addons():
    """Seed standard addons to the database"""
    
    addons_data = [
        {
            'name': 'SGK Entegrasyonu',
            'slug': 'sgk-entegrasyonu',
            'description': 'Klinik hastaların SGK sorgularını otomatik olarak yapabilirsiniz',
            'addon_type': AddOnType.FLAT_FEE,
            'price': 2000.0,
            'is_active': True
        },
        {
            'name': 'E-Fatura Entegrasyonu',
            'slug': 'efatura',
            'description': 'Dijital faturalarınızı otomatik oluşturun ve GİB\'e gönderin',
            'addon_type': AddOnType.FLAT_FEE,
            'price': 1500.0,
            'is_active': True
        },
        {
            'name': 'SMS Kontör Paketi',
            'slug': 'sms-kontor',
            'description': '10,000 ek SMS kontörü',
            'addon_type': AddOnType.USAGE_BASED,
            'price': 500.0,
            'unit_name': 'SMS',
            'limit_amount': 10000,
            'is_active': True
        },
        {
            'name': 'Ekstra Kullanıcı Paketi',
            'slug': 'extra-users',
            'description': '5 ek kullanıcı hesabı',
            'addon_type': AddOnType.PER_USER,
            'price': 800.0,
            'unit_name': 'kullanıcı',
            'limit_amount': 5,
            'is_active': True
        },
        {
            'name': 'WhatsApp Business API',
            'slug': 'whatsapp-api',
            'description': 'WhatsApp üzerinden müşterilerinizle iletişim kurun',
            'addon_type': AddOnType.FLAT_FEE,
            'price': 1200.0,
            'is_active': True
        }
    ]
    
    print("Starting addon seeding...")
    
    for addon_data in addons_data:
        # Check if addon already exists
        existing = AddOn.query.filter_by(slug=addon_data['slug']).first()
        if existing:
            print(f"Addon '{addon_data['name']}' already exists, skipping...")
            continue
        
        addon = AddOn(**addon_data)
        db.session.add(addon)
        print(f"Created addon: {addon_data['name']}")
    
    db.session.commit()
    print("Addon seeding completed!")

if __name__ == '__main__':
    from app import app
    with app.app_context():
        seed_addons()
