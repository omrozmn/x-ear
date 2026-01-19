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
    """Additional pytest configuration."""
    pass
