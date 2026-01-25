import pytest
from core.models.user import User
from core.models.app import App
import importlib
import uuid

def test_seed_apps_assign_owner(db_session):
    # Ensure there is an admin user to become owner
    admin = db_session.query(User).filter_by(role='admin').order_by(User.created_at).first()
    if not admin:
        admin = User(
            id=str(uuid.uuid4()),
            username='admin2',
            email='admin@xear.test',  # Use email that seed_apps.py looks for
            role='admin',
            is_active=True
        )
        admin.set_password('admin123')
        db_session.add(admin)
        db_session.commit()

    # Run the seed script
    # We might need to adjust this depending on where seed_apps is now
    try:
        seed_mod = importlib.import_module('core.scripts.seed_apps')
    except ImportError:
        seed_mod = importlib.import_module('backend.scripts.seed_apps')
    
    seed_mod.main()

    # Refresh the admin object to get the latest state
    db_session.refresh(admin)
    
    # Check admin-panel app exists
    app_rec = db_session.query(App).filter_by(slug='admin-panel').first()
    assert app_rec is not None
    
    # Check owner assigned
    assert app_rec.owner_user_id == admin.id
