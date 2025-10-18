#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(__file__))

from app import app, db
from datetime import datetime
import json

# Import Package model only if present
try:
    
except Exception:
    Package = None


def init_packages():
    with app.app_context():
        if Package is None:
            print('Package model not present in this schema; skipping package initialization')
            return

        # Check if packages already exist
        if Package.query.count() > 0:
            print("Packages already initialized")
            return

        packages_data = [
            {
                'id': 'basic',
                'name': 'Temel Paket',
                'description': 'Küçük klinikler ve bireysel uygulayıcılar için',
                'price_monthly': 299.0,
                'max_patients': 100,
                'max_users': 1,
                'features': json.dumps([
                    'patient_management',
                    'basic_appointments',
                    'simple_reports',
                    'sms_notifications_limited'
                ])
            },
            {
                'id': 'standard',
                'name': 'Standart Paket',
                'description': 'Orta büyüklükteki klinikler için',
                'price_monthly': 599.0,
                'max_patients': 500,
                'max_users': 3,
                'features': json.dumps([
                    'patient_management',
                    'basic_appointments',
                    'device_tracking',
                    'inventory_management',
                    'advanced_reports',
                    'sms_campaigns'
                ])
            },
            {
                'id': 'professional',
                'name': 'Profesyonel Paket',
                'description': 'Büyük klinikler ve çok lokasyonlu işletmeler için',
                'price_monthly': 999.0,
                'max_patients': 2000,
                'max_users': 10,
                'features': json.dumps([
                    'patient_management',
                    'basic_appointments',
                    'device_tracking',
                    'inventory_management',
                    'advanced_reports',
                    'sms_campaigns',
                    'sgk_integration',
                    'ocr_processing',
                    'multi_user_access',
                    'api_access'
                ])
            },
            {
                'id': 'enterprise',
                'name': 'Kurumsal Paket',
                'description': 'Hastane zincirleri ve büyük ağlar için',
                'price_monthly': 1999.0,
                'max_patients': -1,  # Unlimited
                'max_users': -1,  # Unlimited
                'features': json.dumps([
                    'patient_management',
                    'basic_appointments',
                    'device_tracking',
                    'inventory_management',
                    'advanced_reports',
                    'sms_campaigns',
                    'sgk_integration',
                    'ocr_processing',
                    'multi_user_access',
                    'api_access',
                    'multi_branch_management',
                    'advanced_automation',
                    'custom_integrations',
                    'priority_support'
                ])
            }
        ]

        for pkg_data in packages_data:
            package = Package(**pkg_data)
            db.session.add(package)

        db.session.commit()
        print(f"Successfully initialized {len(packages_data)} packages")

if __name__ == "__main__":
    init_packages()