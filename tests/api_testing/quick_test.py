#!/usr/bin/env python3
"""Quick test runner for first 50 endpoints."""
import sys
import logging
from .config import Config
from test_runner import TestRunner

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def main():
    """Run quick test on first 50 endpoints."""
    config = Config()
    config.base_url = "http://localhost:5003"
    
    runner = TestRunner(config)
    
    # Load schema and endpoints
    schema = runner.parser.load_openapi_schema()
    endpoints = runner.parser.extract_endpoints()
    
    print(f"\n{'='*80}")
    print(f"QUICK TEST: First 50 endpoints (out of {len(endpoints)} total)")
    print(f"{'='*80}\n")
    
    # Authenticate
    runner._authenticate()
    
    # Create resources
    runner._create_resources()
    
    # Test only first 50 endpoints
    test_endpoints = endpoints[:50]
    runner.stats.total = len(test_endpoints)
    
    runner._execute_tests(test_endpoints)
    
    # Print summary
    print(f"\n{'='*80}")
    print("QUICK TEST RESULTS")
    print(f"{'='*80}")
    print(f"Total:   {runner.stats.total}")
    print(f"Passed:  {runner.stats.passed} ({runner.stats.success_rate:.1f}%)")
    print(f"Failed:  {runner.stats.failed}")
    print(f"Skipped: {runner.stats.skipped}")
    print(f"{'='*80}\n")
    
    # Analyze failures
    if runner.stats.failed > 0:
        analysis = runner.failure_analyzer.analyze(runner.test_results)
        print("\nFAILURE ANALYSIS:")
        print(f"  404 Not Found: {analysis.get('404', 0)}")
        print(f"  400 Bad Request: {analysis.get('400', 0)}")
        print(f"  401 Unauthorized: {analysis.get('401', 0)}")
        print(f"  403 Forbidden: {analysis.get('403', 0)}")
        print(f"  500 Internal Server Error: {analysis.get('500', 0)}")
        print(f"  Connection/Timeout: {analysis.get('connection', 0)}")
    
    return 0 if runner.stats.failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
