"""
Initialize Database - Pure SQLAlchemy (No Flask)
"""
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(__file__))

from database import engine, Base, DATABASE_URL
from models import *  # Import all models to register them

def init_db():
    print(f"Using database: {DATABASE_URL}")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully via SQLAlchemy")

if __name__ == "__main__":
    init_db()
