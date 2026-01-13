from models.base import db
from models.user import User
from app import create_app

app = create_app()
with app.app_context():
    user = User.query.filter_by(phone='5453092516').first()
    if user:
        print(f"User FOUND: {user.username} (ID: {user.id})")
    else:
        print("User NOT FOUND")
