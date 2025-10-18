"""Seed admin/demo users using application context and ORM.
This script uses the application's User model and set_password method to ensure
seeded users have compatible password hashes. It is safe to run multiple times.
"""
from importlib import import_module

# Import app from backend.app (ensure package path)
app_mod = import_module('backend.app')
app = getattr(app_mod, 'app')

from models.base import db
from models.user import User
from datetime import datetime

SEED_USERS = [
    {
        'username': 'seed-admin',
        'email': 'seed-admin@example.com',
        'phone': '+10000000000',
        'password': 'AdminPass123!',
        'first_name': 'System',
        'last_name': 'Administrator',
        'role': 'admin'
    },
    {
        'username': 'seed-demo',
        'email': 'seed-demo@example.com',
        'phone': '+10000000001',
        'password': 'DemoPass123!',
        'first_name': 'Demo',
        'last_name': 'User',
        'role': 'user'
    }
]


def upsert_user(s, info):
    u = s.query(User).filter((User.username == info['username']) | (User.email == info['email']) | (User.phone == info.get('phone'))).one_or_none()
    if u:
        print('Updating', info['username'])
        u.email = info['email']
        u.phone = info.get('phone')
        u.first_name = info.get('first_name')
        u.last_name = info.get('last_name')
        u.role = info.get('role', 'user')
        if info.get('password'):
            u.set_password(info['password'])
        u.updated_at = datetime.utcnow()
    else:
        print('Creating', info['username'])
        u = User()
        u.username = info['username']
        u.email = info['email']
        u.phone = info.get('phone')
        u.first_name = info.get('first_name')
        u.last_name = info.get('last_name')
        u.role = info.get('role', 'user')
        if info.get('password'):
            u.set_password(info['password'])
        s.add(u)


def main():
    with app.app_context():
        for info in SEED_USERS:
            upsert_user(db.session, info)
        db.session.commit()
        print('App-based seeding complete')


if __name__ == '__main__':
    main()
