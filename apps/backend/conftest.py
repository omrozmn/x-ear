import os
import pytest
from alembic.config import Config
from alembic import command
from dotenv import load_dotenv
import tempfile


def run_migrations():
    here = os.path.dirname(os.path.abspath(__file__))
    # Load local .env so DATABASE_URL in backend/.env is respected during test migrations
    load_dotenv(os.path.join(here, '.env'))
    alembic_ini = os.path.join(here, 'alembic.ini')
    if not os.path.exists(alembic_ini):
        alembic_ini = os.path.join(here, 'alembic', '..', 'alembic.ini')
    config = Config(alembic_ini)
    config.set_main_option('script_location', os.path.join(here, 'alembic'))
    # Allow CI and tests to override the database url via DATABASE_URL
    db_url = os.getenv('DATABASE_URL')
    # Use an ephemeral sqlite file for tests unless DATABASE_URL is explicitly provided
    if not db_url:
        tmpf = tempfile.NamedTemporaryFile(prefix='test_xear_db_', suffix='.db', delete=False)
        tmpf.close()
        db_url = f"sqlite:///{tmpf.name}"
        os.environ['DATABASE_URL'] = db_url
    # If using a file-based sqlite URL for tests, remove existing file to ensure a clean state
    if db_url and db_url.startswith('sqlite:///'):
        sqlite_path = db_url[len('sqlite:///'):]
        if not os.path.isabs(sqlite_path):
            sqlite_path = os.path.abspath(os.path.join(here, '..', sqlite_path))
        try:
            if os.path.exists(sqlite_path):
                os.remove(sqlite_path)
        except Exception:
            pass
    if db_url:
        config.set_main_option('sqlalchemy.url', db_url)
    try:
        command.upgrade(config, 'heads')
    except Exception:
        # Already applied or failure is non-fatal for tests
        pass


@pytest.fixture(scope='session', autouse=True)
def migrations():
    # Allow skipping alembic migrations in quick/local test runs by setting SKIP_MIGRATIONS=1
    if not os.getenv('SKIP_MIGRATIONS'):
        run_migrations()
    # Ensure SQLAlchemy metadata is created for test DBs (helps when alembic env
    # may not create everything or during early-test runs with a fresh sqlite file)
    try:
        from app import app, db
        from models import Device
        with app.app_context():
            db.create_all()
            # Seed minimal devices if database is empty (useful for ephemeral CI DBs)
            try:
                if Device.query.count() == 0:
                    # Create a few hearing-aid devices so /api/devices can return data
                    hearing_samples = [
                        Device(id='dev_sample_001', brand='Phonak', model='P90', device_type='RIC', category='hearing_aid'),
                        Device(id='dev_sample_002', brand='Oticon', model='More1', device_type='BTE', category='hearing_aid'),
                    ]
                    db.session.bulk_save_objects(hearing_samples)
                    db.session.commit()
            except Exception:
                db.session.rollback()
    except Exception:
        # If this fails we still let tests run and rely on alembic; surface issues via failing tests
        pass

@pytest.fixture
def client(migrations):
    # Import app lazily to ensure migrations applied first
    from app import app
    app.testing = True
    app.config['PROPAGATE_EXCEPTIONS'] = True
    with app.test_client() as client:
        yield client
