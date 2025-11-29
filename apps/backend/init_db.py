
import sys
import os

# Add parent directory to path to import app
sys.path.append(os.path.dirname(__file__))

from app import app, db

def init_db():
    with app.app_context():
        print(f"Using database: {app.config['SQLALCHEMY_DATABASE_URI']}")
        db.create_all()
        print("✅ Database tables created successfully via SQLAlchemy")

if __name__ == "__main__":
    init_db()
