#!/usr/bin/env python3
"""Test if TestRunner initialization hangs."""
import sys
import logging
import signal

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

# Set alarm to kill after 10 seconds
def timeout_handler(signum, frame):
    print("TIMEOUT: TestRunner initialization took too long!")
    sys.exit(1)

signal.signal(signal.SIGALRM, timeout_handler)
signal.alarm(10)

try:
    print('Step 1: Importing modules...')
    from tests.api_testing.config import Config
    print('Step 2: Creating config...')
    config = Config(base_url='http://localhost:5003')
    print('Step 3: Importing TestRunner...')
    from tests.api_testing.test_runner import TestRunner
    print('Step 4: Creating TestRunner (this might hang)...')
    runner = TestRunner(config)
    print('Step 5: TestRunner created successfully!')
    signal.alarm(0)  # Cancel alarm
except Exception as e:
    print(f'ERROR: {e}')
    import traceback
    traceback.print_exc()
    sys.exit(1)
