#!/usr/bin/env python3
"""
Optimize API tests by fixing backend issues and improving test data generation.
Current: 302/513 (58.87%)
Target: 513/513 (100%)
"""

import sys
from pathlib import Path

def analyze_failures(results_file="test_results_current.json"):
    """Analyze test failures and categorize them."""
    
    with open(results_file, 'r') as f:
        content = f.read()
    
    # Parse the report (it's text format, not JSON)
    lines = content.split('\n')
    
    failures = {
        '404': [],
        '400': [],
        '422': [],
        '500': [],
        '401': [],
        '403': [],
        'other': []
    }
    
    current_endpoint = None
    current_status = None
    
    for line in lines:
        if '|' in line and ('POST' in line or 'GET' in line or 'PUT' in line or 'DELETE' in line or 'PATCH' in line):
            parts = [p.strip() for p in line.split('|')]
            if len(parts) >= 3:
                endpoint = parts[0] + ' ' + parts[1]
                status = parts[2]
                error = parts[3] if len(parts) > 3 else ''
                
                if status in failures:
                    failures[status].append({
                        'endpoint': endpoint,
                        'error': error
                    })
                elif status.isdigit():
                    failures['other'].append({
                        'endpoint': endpoint,
                        'status': status,
                        'error': error
                    })
    
    return failures

def generate_fix_recommendations(failures):
    """Generate fix recommendations based on failure patterns."""
    
    recommendations = []
    
    # 404 errors - resource not found
    if failures['404']:
        recommendations.append({
            'priority': 'HIGH',
            'category': 'Resource Tracking',
            'count': len(failures['404']),
            'description': 'Resources not found - test framework needs better resource ID tracking',
            'action': 'Update resource_manager.py to properly store and retrieve resource IDs',
            'examples': failures['404'][:5]
        })
    
    # 422 errors - validation
    if failures['422']:
        recommendations.append({
            'priority': 'MEDIUM',
            'category': 'Data Generation',
            'count': len(failures['422']),
            'description': 'Validation errors - schema data generator needs improvement',
            'action': 'Update schema_data_generator.py to handle complex validation rules',
            'examples': failures['422'][:5]
        })
    
    # 400 errors - bad request
    if failures['400']:
        recommendations.append({
            'priority': 'MEDIUM',
            'category': 'Request Format',
            'count': len(failures['400']),
            'description': 'Bad request errors - incorrect request format or missing required fields',
            'action': 'Review OpenAPI schema and update data generator',
            'examples': failures['400'][:5]
        })
    
    # 500 errors - backend bugs
    if failures['500']:
        recommendations.append({
            'priority': 'CRITICAL',
            'category': 'Backend Bugs',
            'count': len(failures['500']),
            'description': 'Internal server errors - backend code issues',
            'action': 'Fix backend code bugs',
            'examples': failures['500'][:5]
        })
    
    # 401 errors - auth issues
    if failures['401']:
        recommendations.append({
            'priority': 'LOW',
            'category': 'Authentication',
            'count': len(failures['401']),
            'description': 'Authentication issues - some endpoints need specific auth context',
            'action': 'Update auth_manager.py to provide correct auth context',
            'examples': failures['401'][:5]
        })
    
    # 403 errors - permission issues
    if failures['403']:
        recommendations.append({
            'priority': 'LOW',
            'category': 'Permissions',
            'count': len(failures['403']),
            'description': 'Permission issues - plan limits or insufficient permissions',
            'action': 'Use enterprise plan for testing or adjust permissions',
            'examples': failures['403'][:5]
        })
    
    return recommendations

def print_report(failures, recommendations):
    """Print analysis report."""
    
    print("=" * 80)
    print("API TEST OPTIMIZATION REPORT")
    print("=" * 80)
    print()
    
    print("FAILURE SUMMARY")
    print("-" * 80)
    total_failures = sum(len(v) for v in failures.values())
    for status, items in failures.items():
        if items:
            percentage = (len(items) / total_failures * 100) if total_failures > 0 else 0
            print(f"  {status}: {len(items)} ({percentage:.1f}%)")
    print()
    
    print("FIX RECOMMENDATIONS (by priority)")
    print("-" * 80)
    
    # Sort by priority
    priority_order = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3}
    recommendations.sort(key=lambda x: priority_order.get(x['priority'], 99))
    
    for i, rec in enumerate(recommendations, 1):
        print(f"\n{i}. [{rec['priority']}] {rec['category']}")
        print(f"   Count: {rec['count']} failures")
        print(f"   Issue: {rec['description']}")
        print(f"   Action: {rec['action']}")
        if rec['examples']:
            print("   Examples:")
            for ex in rec['examples'][:3]:
                print(f"     - {ex['endpoint']}: {ex.get('error', 'N/A')}")
    
    print()
    print("=" * 80)
    print("NEXT STEPS")
    print("=" * 80)
    print()
    print("1. Fix CRITICAL issues first (500 errors)")
    print("2. Improve resource tracking (404 errors)")
    print("3. Enhance data generation (422/400 errors)")
    print("4. Address auth/permission issues (401/403 errors)")
    print()
    print("Estimated impact:")
    print(f"  - Fix 500 errors: +{len(failures['500'])} tests")
    print(f"  - Fix 404 errors: +{len(failures['404'])} tests")
    print(f"  - Fix 422/400 errors: +{len(failures['422']) + len(failures['400'])} tests")
    print(f"  - Fix 401/403 errors: +{len(failures['401']) + len(failures['403'])} tests")
    print(f"  - Total potential: +{total_failures} tests")
    print()
    print("Current: 302/513 (58.87%)")
    print(f"Target: {302 + total_failures}/513 ({(302 + total_failures) / 513 * 100:.1f}%)")
    print()

def main():
    """Main function."""
    
    results_file = "test_results_current.json"
    
    if not Path(results_file).exists():
        print(f"Error: {results_file} not found")
        print("Run tests first: python -m tests.api_testing.cli --base-url http://localhost:5003")
        sys.exit(1)
    
    print("Analyzing test failures...")
    failures = analyze_failures(results_file)
    
    print("Generating recommendations...")
    recommendations = generate_fix_recommendations(failures)
    
    print_report(failures, recommendations)

if __name__ == "__main__":
    main()
