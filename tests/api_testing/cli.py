#!/usr/bin/env python3
"""
Command-line interface for the Automated API Testing System.

Usage:
    python -m tests.api_testing.cli [options]
    
Examples:
    # Run with default settings
    python -m tests.api_testing.cli
    
    # Run with custom OpenAPI file
    python -m tests.api_testing.cli --openapi-file custom_openapi.yaml
    
    # Run with custom base URL
    python -m tests.api_testing.cli --base-url http://localhost:8000
    
    # Dry run (generate tests without executing)
    python -m tests.api_testing.cli --dry-run
    
    # Verbose output
    python -m tests.api_testing.cli --verbose
    
    # Save report to file
    python -m tests.api_testing.cli --output-report report.txt
"""

import argparse
import sys
import logging
from pathlib import Path

from .config import Config
from test_runner import TestRunner
from .logging_config import setup_logging


def parse_args():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Automated API Testing System for X-Ear CRM",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                                    # Run with defaults
  %(prog)s --base-url http://localhost:8000   # Custom backend URL
  %(prog)s --dry-run                          # Generate tests only
  %(prog)s --verbose                          # Detailed logging
  %(prog)s --output-report report.txt         # Save report to file
        """
    )
    
    # Backend configuration
    parser.add_argument(
        '--config',
        '-c',
        help='Path to configuration file (.yaml, .yml, or .json)'
    )
    
    parser.add_argument(
        '--base-url',
        default=None,
        help='Base URL of the API backend (default: http://localhost:5003)'
    )
    
    parser.add_argument(
        '--openapi-file',
        default=None,
        help='Path to OpenAPI specification file (default: openapi.yaml)'
    )
    
    # Authentication
    parser.add_argument(
        '--admin-email',
        default=None,
        help='Admin email for authentication (default: admin@xear.com)'
    )
    
    parser.add_argument(
        '--admin-password',
        default=None,
        help='Admin password for authentication (default: admin123)'
    )
    
    # Execution options
    parser.add_argument(
        '--timeout',
        type=int,
        default=None,
        help='Request timeout in seconds (default: 15)'
    )
    
    parser.add_argument(
        '--max-retries',
        type=int,
        default=None,
        help='Maximum number of retries for failed requests (default: 3)'
    )
    
    parser.add_argument(
        '--parallel',
        action='store_true',
        help='Enable parallel test execution (experimental)'
    )
    
    # Output options
    parser.add_argument(
        '--output-report',
        help='Path to save the test report (default: print to console)'
    )
    
    parser.add_argument(
        '--verbose',
        '-v',
        action='store_true',
        help='Enable verbose logging (DEBUG level)'
    )
    
    parser.add_argument(
        '--quiet',
        '-q',
        action='store_true',
        help='Suppress all output except errors'
    )
    
    # Special modes
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Generate tests without executing them'
    )
    
    parser.add_argument(
        '--list-endpoints',
        action='store_true',
        help='List all endpoints and exit'
    )
    
    return parser.parse_args()


def list_endpoints(config: Config):
    """List all endpoints from OpenAPI spec and exit."""
    from .openapi_parser import OpenAPIParser
    from endpoint_categorizer import categorize_endpoint
    
    parser = OpenAPIParser(config.openapi_file)
    schema = parser.load_openapi_schema()
    endpoints = parser.extract_endpoints()
    
    print(f"OpenAPI Version: {schema.get('info', {}).get('version', 'unknown')}")
    print(f"Total Endpoints: {len(endpoints)}")
    print()
    
    # Group by category
    by_category = {}
    for endpoint in endpoints:
        category = categorize_endpoint(endpoint.path)
        if category not in by_category:
            by_category[category] = []
        by_category[category].append(endpoint)
    
    # Print by category
    for category, eps in sorted(by_category.items(), key=lambda x: x[0].value):
        print(f"\n{category.value} ({len(eps)} endpoints):")
        print("-" * 80)
        for ep in sorted(eps, key=lambda x: (x.path, x.method)):
            print(f"  {ep.method.upper():6} {ep.path}")


def dry_run(config: Config):
    """Generate tests without executing them."""
    from .openapi_parser import OpenAPIParser
    from endpoint_categorizer import categorize_endpoint
    from .path_substitution import substitute_path_params
    from resource_manager import ResourceRegistry
    
    parser = OpenAPIParser(config.openapi_file)
    schema = parser.load_openapi_schema()  # Load schema first
    endpoints = parser.extract_endpoints()
    
    # Create dummy registry for path substitution
    registry = ResourceRegistry()
    registry.plan_id = "plan_123"
    registry.tenant_id = "tenant_123"
    registry.admin_user_id = "user_123"
    registry.party_id = "party_123"
    registry.role_id = "role_123"
    registry.sale_id = "sale_123"
    registry.invoice_id = "invoice_123"
    registry.device_id = "device_123"
    
    print(f"Dry run: Generating tests for {len(endpoints)} endpoints")
    print()
    
    skipped = 0
    for i, endpoint in enumerate(endpoints, 1):
        path = endpoint.path
        method = endpoint.method
        category = categorize_endpoint(path)  # Only pass path
        
        # Try to substitute path params
        substituted = substitute_path_params(path, registry)
        
        if substituted is None:
            status = "SKIP (missing resource)"
            skipped += 1
        else:
            status = "OK"
        
        print(f"[{i:3}/{len(endpoints)}] {method.upper():6} {path:50} [{category.value:15}] {status}")
    
    print()
    print(f"Summary: {len(endpoints) - skipped} tests would run, {skipped} would be skipped")


def main():
    """Main entry point for CLI."""
    args = parse_args()
    
    # Setup logging
    if args.quiet:
        log_level = logging.ERROR
    elif args.verbose:
        log_level = logging.DEBUG
    else:
        log_level = logging.INFO
    
    setup_logging(log_level)
    logger = logging.getLogger(__name__)
    
    # Create config with priority: CLI args > config file > env > defaults
    config = Config.from_file_with_overrides(
        config_file=args.config,
        base_url=args.base_url,
        openapi_file=args.openapi_file,
        admin_email=args.admin_email,
        admin_password=args.admin_password,
        timeout=args.timeout,
        max_retries=args.max_retries,
        parallel=args.parallel,
        output_report=args.output_report,
        verbose=args.verbose
    )
    
    # Handle special modes
    if args.list_endpoints:
        list_endpoints(config)
        return 0
    
    if args.dry_run:
        dry_run(config)
        return 0
    
    # Run tests
    try:
        logger.info("Starting Automated API Testing System")
        logger.info(f"Backend URL: {config.base_url}")
        logger.info(f"OpenAPI file: {config.openapi_file}")
        
        runner = TestRunner(config)
        stats, report = runner.run_tests()
        
        # Save or print report
        if args.output_report:
            output_path = Path(args.output_report)
            output_path.write_text(report)
            logger.info(f"Report saved to: {output_path}")
        else:
            print()
            print("=" * 80)
            print("TEST REPORT")
            print("=" * 80)
            print(report)
        
        # Exit code based on success rate
        if stats.success_rate >= 95.0:
            logger.info("✓ Test run successful (>95% success rate)")
            return 0
        else:
            logger.warning(f"✗ Test run failed ({stats.success_rate:.2f}% success rate < 95%)")
            return 1
    
    except KeyboardInterrupt:
        logger.warning("Test run interrupted by user")
        return 130  # Standard exit code for SIGINT
    
    except Exception as e:
        logger.error(f"Test run failed with error: {e}", exc_info=True)
        return 1


if __name__ == '__main__':
    sys.exit(main())
