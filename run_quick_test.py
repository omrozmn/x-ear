#!/usr/bin/env python3
"""Run a quick test of a few endpoints."""
import sys
import logging
import signal

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

# Set alarm to kill after 60 seconds
def timeout_handler(signum, frame):
    print("\n\nTIMEOUT: Test execution took too long!")
    sys.exit(1)

signal.signal(signal.SIGALRM, timeout_handler)
signal.alarm(60)

try:
    print('Creating config...')
    from tests.api_testing.config import Config
    config = Config(base_url='http://localhost:5003')
    
    print('Creating TestRunner...')
    from tests.api_testing.test_runner import TestRunner
    runner = TestRunner(config)
    
    print('Running tests...')
    stats, report = runner.run_tests()
    
    print('\n' + '='*80)
    print('TEST RESULTS')
    print('='*80)
    print(f'Total: {stats.total}')
    print(f'Passed: {stats.passed}')
    print(f'Failed: {stats.failed}')
    print(f'Skipped: {stats.skipped}')
    print(f'Success Rate: {stats.success_rate:.2f}%')
    print(f'Duration: {stats.duration:.2f}s')
    
    signal.alarm(0)  # Cancel alarm
    
except Exception as e:
    print(f'\nERROR: {e}')
    import traceback
    traceback.print_exc()
    sys.exit(1)
