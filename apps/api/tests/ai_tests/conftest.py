"""
Pytest configuration for AI Layer tests.
"""

import sys
from pathlib import Path

# Add the api directory to the path for imports
# Use Path for reliable resolution with spaces in path
_api_dir = Path(__file__).resolve().parent.parent.parent
if str(_api_dir) not in sys.path:
    sys.path.insert(0, str(_api_dir))

# Also add to PYTHONPATH for subprocess calls
import os
os.environ.setdefault("PYTHONPATH", str(_api_dir))
