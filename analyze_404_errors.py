#!/usr/bin/env python3
"""Analyze 404 errors and categorize them"""

import re
from collections import defaultdict

# Read failed endpoints
with open('x-ear/failed_endpoints.txt', 'r') as f:
    lines = f.readlines()

# Categorize 404 errors
categories = {
    'null_id': [],           # ID is null/placeholder
    'not_implemented': [],   # Endpoint not implemented
    'missing_data': [],      # Data not created in test
    'tenant_mismatch': []    # Tenant ID mismatch
}

for line in lines:
    if ' 404 ' not in line:
        continue
    
    # Extract endpoint and error message
    parts = line.split(' - ')
    if len(parts) < 3:
        continue
    
    method_endpoint = parts[0].strip()
    error_msg = parts[2].strip()
    
    # Check for null IDs
    if '/null' in method_endpoint or '/{' in method_endpoint:
        categories['null_id'].append((method_endpoint, error_msg))
    # Check for "Not Found" (endpoint not implemented)
    elif error_msg == 'Not Found':
        categories['not_implemented'].append((method_endpoint, error_msg))
    # Check for tenant mismatch
    elif 'Tenant not found' in error_msg and '224ed5c7' in method_endpoint:
        categories['tenant_mismatch'].append((method_endpoint, error_msg))
    # Everything else is missing data
    else:
        categories['missing_data'].append((method_endpoint, error_msg))

# Print report
print("=" * 80)
print("404 ERROR ANALYSIS")
print("=" * 80)
print()

print(f"TOTAL 404 ERRORS: {sum(len(v) for v in categories.values())}")
print()

for category, items in categories.items():
    if not items:
        continue
    
    print(f"\n{'=' * 80}")
    print(f"{category.upper().replace('_', ' ')}: {len(items)} errors")
    print(f"{'=' * 80}")
    
    # Group by error message
    by_error = defaultdict(list)
    for endpoint, error in items:
        by_error[error].append(endpoint)
    
    for error, endpoints in sorted(by_error.items(), key=lambda x: -len(x[1])):
        print(f"\n{error} ({len(endpoints)} endpoints):")
        for ep in endpoints[:5]:  # Show first 5
            print(f"  - {ep}")
        if len(endpoints) > 5:
            print(f"  ... and {len(endpoints) - 5} more")

print("\n" + "=" * 80)
print("RECOMMENDATIONS")
print("=" * 80)
print("""
1. NULL_ID: Fix test script to use actual IDs from created resources
2. NOT_IMPLEMENTED: Check if endpoints exist in backend, if not remove from OpenAPI
3. MISSING_DATA: Create required test data before testing endpoints
4. TENANT_MISMATCH: Use correct tenant ID from switch-tenant response
""")
