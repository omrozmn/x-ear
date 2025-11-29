from app import app, db
from models.admin_user import AdminUser, AdminRole

def seed_admin():
    with app.app_context():
        if not AdminUser.query.filter_by(email='admin@x-ear.com').first():
            admin = AdminUser(
                id='admin-1',
                email='admin@x-ear.com',
                first_name='Super',
                last_name='Admin',
                role=AdminRole.SUPER_ADMIN.value,
                is_active=True
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            print("Admin user created: admin@x-ear.com / admin123")
        else:
            print("Admin user already exists")

if __name__ == "__main__":
    seed_admin()
