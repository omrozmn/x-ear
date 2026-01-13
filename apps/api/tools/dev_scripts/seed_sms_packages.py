import sys
import os
# Add backend root to path to allow imports from app, models, etc.
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
from app import app, db
from models.sms_package import SmsPackage
import logging
import uuid

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_sms_packages():
    with app.app_context():
        # Ensure table exists
        db.create_all()
        
        # Check existing
        existing = SmsPackage.query.count()
        if existing > 0:
            logger.info(f"Found {existing} SMS packages, skipping...")
            return

        packages = [
            {
                "name": "Başlangıç Paketi",
                "sms_count": 1000,
                "price": 99.00,
                "description": "Küçük klinikler için ideal"
            },
            {
                "name": "Orta Paket",
                "sms_count": 5000,
                "price": 449.00,
                "description": "Büyüyen işletmeler için"
            },
            {
                "name": "Pro Paket",
                "sms_count": 10000,
                "price": 849.00,
                "description": "Yüksek hacimli gönderimler için"
            },
            {
                "name": "Mega Paket",
                "sms_count": 50000,
                "price": 3999.00,
                "description": "Kurumsal çözüm"
            }
        ]

        for p in packages:
            pkg = SmsPackage(
                id=str(uuid.uuid4()),
                name=p['name'],
                sms_count=p['sms_count'],
                price=p['price'],
                description=p['description'],
                is_active=True
            )
            db.session.add(pkg)
            logger.info(f"Added package: {p['name']}")

        db.session.commit()
        logger.info("SMS packages created successfully")

if __name__ == "__main__":
    create_sms_packages()
