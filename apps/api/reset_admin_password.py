
from app import app
from models.base import db
from models.admin_user import AdminUser
from werkzeug.security import generate_password_hash

def reset_password():
    with app.app_context():
        admin = AdminUser.query.filter_by(email='admin@x-ear.com').first()
        if admin:
            admin.password_hash = generate_password_hash('admin', method='pbkdf2:sha256')
            db.session.commit()
            print("Password reset successful for admin@x-ear.com")
            
            # Verify
            from werkzeug.security import check_password_hash
            valid = check_password_hash(admin.password_hash, 'admin')
            print(f"Password 'admin' valid: {valid}")
        else:
            print("Admin user not found, creating one.")
            new_admin = AdminUser(
                email='admin@x-ear.com',
                first_name='Admin',
                last_name='User', 
                role='admin',
                is_active=True
            )
            new_admin.password_hash = generate_password_hash('admin', method='pbkdf2:sha256')
            db.session.add(new_admin)
            db.session.commit()
            print("Admin user created.")

if __name__ == '__main__':
    reset_password()
