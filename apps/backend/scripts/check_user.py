#!/usr/bin/env python3
from app import app, db, User
import os

ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'admin')
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', 'admin@x-ear.com')
ADMIN_PHONE = os.getenv('ADMIN_PHONE', '+905551234567')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'admin123')

with app.app_context():
    user = User.query.filter_by(username=ADMIN_USERNAME).first()
    print('Test user exists:', user is not None)
    if user:
        print('Username:', user.username)
        print('Email:', user.email)
        print('Phone:', user.phone)
    else:
        print('Creating test user...')
        test_user = User(
            id=f"user_{__import__('datetime').datetime.now().strftime('%Y%m%d_%H%M%S')}",
            username=ADMIN_USERNAME,
            email=ADMIN_EMAIL,
            phone=ADMIN_PHONE
        )
        test_user.set_password(ADMIN_PASSWORD)
        db.session.add(test_user)
        db.session.commit()
        print('Test user created successfully!')
        print(f'Username: {ADMIN_USERNAME}')
        print('Password: (from ADMIN_PASSWORD env var)')