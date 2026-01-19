#!/usr/bin/env python
"""
Test runner for AI Layer tests.

This script ensures the correct Python path is set before running pytest.
Usage: python run_ai_tests.py [pytest args]
"""

import sys
import os
from pathlib import Path

# Get the api directory (where this script is located)
API_DIR = Path(__file__).resolve().parent

# Add to sys.path BEFORE importing pytest
if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

# Change to the api directory
os.chdir(API_DIR)

# Verify the import works
try:
    from ai.config import AIPhase
    print(f"✓ AI module import successful: {AIPhase.A}")
except ImportError as e:
    print(f"✗ AI module import failed: {e}")
    sys.exit(1)

# Now import and run pytest
import pytest

# Default args if none provided
if len(sys.argv) == 1:
    args = ['-v', '--tb=short', '--import-mode=importlib', 'tests/ai/']
else:
    args = ['--import-mode=importlib'] + sys.argv[1:]

print(f"Running: pytest {' '.join(args)}")
sys.exit(pytest.main(args))
