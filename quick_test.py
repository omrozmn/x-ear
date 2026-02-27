#!/usr/bin/env python3
"""Quick test runner without relative imports."""
import sys
import os

# Add test directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'tests', 'api_testing'))

# Now import modules
import config
import test_runner

if __name__ == '__main__':
    cfg = config.Config(
        base_url='http://localhost:5003',
        openapi_file='openapi.yaml',
        output_report='test_results/report.json',
        failed_log='test_run_session67.log'
    )
    
    runner = test_runner.TestRunner(cfg)
    stats, report = runner.run_tests()
    
    print(f'\n=== TEST RESULTS ===')
    print(f'Total: {stats.total}')
    print(f'Passed: {stats.passed}')
    print(f'Failed: {stats.failed}')
    print(f'Skipped: {stats.skipped}')
    print(f'Success Rate: {stats.passed}/{stats.total} ({stats.success_rate:.1f}%)')
    
    # Save report
    with open('test_run_session67.log', 'w') as f:
        f.write(report)
