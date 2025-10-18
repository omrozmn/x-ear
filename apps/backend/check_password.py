import sys
import os
sys.path.append('.')
from models.base import db
from models.user import User
from app import app

with app.app_context():
    user = User.query.filter_by(username='seed-admin').first()
    if user:
        print(f'User: {user.username}')
        print(f'Password hash: {user.password_hash}')
        print(f'Check AdminPass123!: {user.check_password("AdminPass123!")}')
        print(f'Check admin123: {user.check_password("admin123")}')
    else:
        print('User not found')