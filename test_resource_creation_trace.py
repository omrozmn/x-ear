#!/usr/bin/env python3
"""Trace resource creation to find where it hangs."""
import sys
import logging
import signal

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(message)s')

# Set alarm to kill after 30 seconds
def timeout_handler(signum, frame):
    print("\n\nTIMEOUT: Resource creation took too long!")
    sys.exit(1)

signal.signal(signal.SIGALRM, timeout_handler)
signal.alarm(30)

try:
    print('Creating config...')
    from tests.api_testing.config import Config
    config = Config(base_url='http://localhost:5003')
    
    print('Creating TestRunner...')
    from tests.api_testing.test_runner import TestRunner
    runner = TestRunner(config)
    
    print('Authenticating...')
    runner._authenticate()
    
    print('Creating resources (this is where it might hang)...')
    runner._create_resources()
    
    print('SUCCESS: All resources created!')
    signal.alarm(0)  # Cancel alarm
    
    # Print created resource IDs
    print('\nCreated resources:')
    print(f'  Tenant ID: {runner.resource_manager.registry.tenant_id}')
    print(f'  Admin User ID: {runner.resource_manager.registry.admin_user_id}')
    print(f'  Party ID: {runner.resource_manager.registry.party_id}')
    print(f'  Device ID: {runner.resource_manager.registry.device_id}')
    print(f'  Sale ID: {runner.resource_manager.registry.sale_id}')
    
except Exception as e:
    print(f'\nERROR: {e}')
    import traceback
    traceback.print_exc()
    sys.exit(1)
