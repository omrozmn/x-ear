import json
from app import app
import os
from alembic.config import Config
from alembic import command


# Apply alembic migrations to ensure schema is up-to-date for tests
def run_migrations():
    here = os.path.dirname(os.path.abspath(__file__))
    # alembic.ini lives in backend/ directory
    alembic_ini = os.path.join(here, 'alembic.ini')
    if not os.path.exists(alembic_ini):
        # Support running tests from repo root where backend/ is a package
        alembic_ini = os.path.join(here, 'alembic', '..', 'alembic.ini')
    config = Config(alembic_ini)
    config.set_main_option('script_location', os.path.join(here, 'alembic'))
    # Respect environment DATABASE_URL when running tests
    db_url = os.getenv('DATABASE_URL')
    if db_url:
        config.set_main_option('sqlalchemy.url', db_url)
    # Use sqlite file configured in alembic or the environment
    try:
        command.upgrade(config, 'head')
    except Exception:
        # If migration fails, tests will still attempt to run - log and continue
        print('Alembic upgrade failed or already applied')


# Only run migrations here if this test module invoked in isolation; when pytest
# runs with the 'migrations' fixture, conftest will apply migrations already.
if os.getenv('RUN_ISOLATED_MIGRATIONS', 'true').lower() == 'true':
    run_migrations()


def test_hearing_aid_category_returns_devices():
    app.testing = True
    app.config['PROPAGATE_EXCEPTIONS'] = True
    client = app.test_client()
    resp = client.get('/api/devices?inventory_only=true&category=hearing_aid')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data and isinstance(data, dict)
    devices = data.get('devices', [])
    assert isinstance(devices, list)
    assert len(devices) > 0, f'Expected devices but got empty list. Payload: {data}'

    # Basic shape checks: backend Device objects may not include inventory-specific fields
    d = devices[0]
    assert 'id' in d
    assert ('brand' in d) or ('model' in d)

    # Inventory-only flag should filter appropriately (if field present)
    if 'availableInventory' in d:
        assert isinstance(d['availableInventory'], (int, float))


def test_legacy_category_token_no_longer_matches():
    """Legacy tokens (e.g. 'isitme_cihazi') should no longer be mapped by the API.
    Calls using legacy tokens should not return hearing-aid devices.
    """
    client = app.test_client()
    resp = client.get('/api/devices?inventory_only=true&category=isitme_cihazi')
    assert resp.status_code == 200
    data = resp.get_json()
    devices = data.get('devices', [])
    assert isinstance(devices, list)
    assert len(devices) == 0, 'Legacy category token unexpectedly returned devices; client must use canonical token "hearing_aid".'


def test_device_model_has_category_attribute():
    # Ensure SQLAlchemy model exposes the new 'category' attribute
    from models import Device
    assert hasattr(Device, 'category'), 'Device model should have a "category" attribute'
