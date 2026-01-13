
from app import app, db
from models.admin_user import AdminUser
from werkzeug.security import generate_password_hash

def reset_admin():
    with app.app_context():
        import uuid
        user = AdminUser.query.filter_by(email="admin@x-ear.com").first()
        if user:
            print("Found admin user.")
            user.password_hash = generate_password_hash("password123", method='pbkdf2:sha256')
            db.session.commit()
            print("Reset admin password to 'password123'")
        else:
            print("Admin user not found! Creating...")
            user = AdminUser(
                id=str(uuid.uuid4()),
                email="admin@x-ear.com",
                first_name="Super",
                last_name="Admin",
                role="super_admin",
                is_active=True
            )
            user.set_password("password123")
            db.session.add(user)
            db.session.commit()
            print("Created admin user with password 'password123'")

if __name__ == "__main__":
    reset_admin()
