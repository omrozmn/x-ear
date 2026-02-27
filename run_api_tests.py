#!/usr/bin/env python3
"""Run API tests."""
import sys
import os

# Change to x-ear directory and run as module
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

# Run as Python module
import subprocess
result = subprocess.run([
    sys.executable, '-m', 'tests.api_testing.cli',
    '--base-url', 'http://localhost:5003'
])

sys.exit(result.returncode)
