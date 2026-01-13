#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(__file__))

import models
from datetime import datetime
from utils import now_utc


def test_database(migrations):
    # Import app lazily after migrations fixture has run
    from app import app, db, User

    with app.app_context():
        # Check packages if model exists
        if hasattr(models, 'Package'):
            Package = getattr(models, 'Package')
            packages = Package.query.all()
            print(f"Found {len(packages)} packages:")
            for pkg in packages:
                print(f"  - {pkg.id}: {pkg.name} - ₺{getattr(pkg, 'price_monthly', 'N/A')}/month")
        else:
            print("⚠️ Package model not present in this schema; skipping package checks")

        # Check if we can create a test user
        test_user = User(
            id=f"user_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            username=f"testuser_{int(now_utc().timestamp() * 1000)}",
            email=f"test2+{int(now_utc().timestamp() * 1000)}@example.com",
            phone=f"+90{int(now_utc().timestamp() * 1000) % 1000000000:09d}"
        )
        test_user.set_password("testpass123")

        # Get standard package
        if hasattr(models, 'Package') and hasattr(models, 'UserSubscription'):
            Package = getattr(models, 'Package')
            UserSubscription = getattr(models, 'UserSubscription')
            standard_pkg = Package.query.filter_by(id='standard').first()
            if standard_pkg:
                print(f"\nSelected package: {standard_pkg.name}")

                # Create subscription
                subscription = UserSubscription(
                    id=f"trial_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{test_user.id[-6:]}",
                    user_id=test_user.id,
                    package_id='standard',
                    status='trial',
                    trial_start_date=now_utc(),
                    trial_end_date=now_utc().replace(day=now_utc().day + 7)
                )

                db.session.add(test_user)
                db.session.add(subscription)
                db.session.commit()

                print("✅ Test user and subscription created successfully!")
                print(f"User ID: {test_user.id}")
                print(f"Subscription ID: {subscription.id}")
                print(f"Trial ends: {subscription.trial_end_date}")
            else:
                print("❌ Standard package not found")
        else:
            # If subscription models not present, persist the user only
            db.session.add(test_user)
            db.session.commit()
            print("⚠️ Subscription models not present; created user only")


if __name__ == "__main__":
    test_database()