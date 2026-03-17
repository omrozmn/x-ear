"""
Pytest configuration for API tests.
"""

import sys
from pathlib import Path

# Add the api directory to the path IMMEDIATELY (not in a hook)
# This ensures the path is available before test collection
_api_dir = Path(__file__).resolve().parent
if str(_api_dir) not in sys.path:
    sys.path.insert(0, str(_api_dir))


def pytest_configure(config):
    """Additional pytest configuration.

    Set critical environment variables BEFORE any application module is
    imported so that ``core.database`` creates the engine with the in-memory
    DB URL instead of the file-based production default.
    """
    import os
    # Use direct assignment (not setdefault) because main.py's
    # load_dotenv(override=True) would overwrite setdefault values.
    os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
    os.environ['JWT_SECRET_KEY'] = 'test-secret'
    os.environ['TESTING'] = 'true'
    os.environ['APP_ENV'] = 'testing'
    os.environ['SMTP_ENCRYPTION_KEY'] = '1RRDcoqlZU8KwHa_Y0ylelmteMsSM6Wgl07RJsGL2-k='
