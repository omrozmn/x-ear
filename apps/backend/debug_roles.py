
from app import app
from models.role import Role

with app.app_context():
    roles = Role.query.all()
    print("Existing Roles:")
    for r in roles:
        print(f"ID: {r.id}, Name: '{r.name}', IsSystem: {r.is_system}")
