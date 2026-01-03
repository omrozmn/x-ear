
from app import app
from models import db
from models.role import Role

REQUIRED_ROLES = ['odyolog', 'odyometrist', 'secretary', 'user', 'admin']

with app.app_context():
    for role_name in REQUIRED_ROLES:
        existing = Role.query.filter_by(name=role_name).first()
        if not existing:
            print(f"Creating missing role: {role_name}")
            role = Role(name=role_name, description=f"{role_name.capitalize()} role")
            db.session.add(role)
        else:
            print(f"Role already exists: {role_name}")
    
    db.session.commit()
    print("Role seeding complete.")
