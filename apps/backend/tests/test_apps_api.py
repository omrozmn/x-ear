from backend import app
from models.base import db
from models.user import User
import importlib


def test_seed_apps_assign_owner(client):
    with client.application.app_context():
        # Ensure there is an admin user to become owner
        admin = User.query.filter_by(role='admin').order_by(User.created_at).first()
        if not admin:
            admin = User()
            admin.username = 'admin2'
            admin.email = 'admin@xear.test'  # Use email that seed_apps.py looks for
            admin.set_password('admin123')
            admin.role = 'admin'
            db.session.add(admin)
            db.session.commit()
            print(f"DEBUG: Created admin user with email {admin.email} and id {admin.id}")

        # Run the seed script
        seed_mod = importlib.import_module('backend.scripts.seed_apps')
        seed_mod.main()

        # Refresh the admin object to get the latest state
        db.session.refresh(admin)
        
        # Check admin-panel app exists
        app_rec = App.query.filter_by(slug='admin-panel').one_or_none()
        assert app_rec is not None
        print(f"DEBUG: Found app {app_rec.slug} with owner_user_id {app_rec.owner_user_id}")
        
        # Check owner assigned - the seed script should have set the owner_user_id
        assert app_rec.owner_user_id == admin.id

