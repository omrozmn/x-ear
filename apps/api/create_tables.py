#!/usr/bin/env python3
"""Create all database tables"""

from app import app
from models import db

if __name__ == '__main__':
    with app.app_context():
        print("Creating all database tables...")
        db.create_all()
        print("✅ All tables created successfully!")
