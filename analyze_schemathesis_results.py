#!/usr/bin/env python3
"""
Analyze Schemathesis test results and create detailed report
"""
import re
import json
from collections import defaultdict

def parse_log_file(filename):
    """Parse Schemathesis log file and extract all issues"""
    
    issues = {
        'server_errors': [],
        'schema_violations': [],
        'accepted_invalid': [],
        'rejected_valid': [],
        'undocumented_status': []
    }
    
    with open(filename, 'r') as f:
        content = f.read()
    
    # Split by test cases
    test_cases = re.split(r'_+\s+(GET|POST|PUT|DELETE|PATCH)\s+(/[^\s]+)', content)
    
    current_endpoint = None
    current_method = None
    
    for i in range(0, len(test_cases), 3):
        if i + 2 < len(test_cases):
            method = test_cases[i + 1] if i + 1 < len(test_cases) else None
            endpoint = test_cases[i + 2] if i + 2 < len(test_cases) else None
            test_content = test_cases[i] if i < len(test_cases) else ""
            
            if method and endpoint:
                current_method = method
                current_endpoint = endpoint
                
                # Extract error messages
                if 'Server error' in test_content:
                    error_match = re.search(r'\[500\] Internal Server Error:\s*`([^`]+)`', test_content)
                    if error_match:
                        error_json = error_match.group(1)
                        try:
                            error_data = json.loads(error_json)
                            error_msg = error_data.get('error', {}).get('message', 'Unknown error')
                        except:
                            error_msg = error_json[:200]
                        
                        issues['server_errors'].append({
                            'endpoint': f"{method} {endpoint}",
                            'error': error_msg
                        })
                
                if 'Response violates schema' in test_content:
                    issues['schema_violations'].append({
                        'endpoint': f"{method} {endpoint}",
                        'details': 'Schema mismatch'
                    })
                
                if 'API accepted schema-violating request' in test_content:
                    issues['accepted_invalid'].append(f"{method} {endpoint}")
                
                if 'API rejected schema-compliant request' in test_content:
                    issues['rejected_valid'].append(f"{method} {endpoint}")
                
                if 'Undocumented HTTP status code' in test_content:
                    status_match = re.search(r'Received: (\d+)', test_content)
                    if status_match:
                        status = status_match.group(1)
                        issues['undocumented_status'].append({
                            'endpoint': f"{method} {endpoint}",
                            'status': status
                        })
    
    return issues

def generate_report(issues):
    """Generate detailed markdown report"""
    
    report = []
    report.append("# Schemathesis Test Results - Detailed Analysis\n")
    report.append("Generated: 2026-02-17\n\n")
    
    # Server Errors
    report.append(f"## 1. Server Errors (500) - {len(issues['server_errors'])} issues\n\n")
    
    # Group by error type
    error_groups = defaultdict(list)
    for error in issues['server_errors']:
        error_msg = error['error'][:100]  # First 100 chars
        error_groups[error_msg].append(error['endpoint'])
    
    for error_msg, endpoints in sorted(error_groups.items(), key=lambda x: len(x[1]), reverse=True):
        report.append(f"### Error: `{error_msg}`\n")
        report.append(f"**Affected endpoints ({len(endpoints)}):**\n")
        for ep in endpoints[:10]:
            report.append(f"- {ep}\n")
        if len(endpoints) > 10:
            report.append(f"- ... and {len(endpoints) - 10} more\n")
        report.append("\n")
    
    # Schema Violations
    report.append(f"## 2. Response Schema Violations - {len(issues['schema_violations'])} issues\n\n")
    for violation in issues['schema_violations'][:20]:
        report.append(f"- {violation['endpoint']}\n")
    if len(issues['schema_violations']) > 20:
        report.append(f"- ... and {len(issues['schema_violations']) - 20} more\n")
    report.append("\n")
    
    # Accepted Invalid
    report.append(f"## 3. API Accepted Invalid Requests - {len(issues['accepted_invalid'])} issues\n\n")
    for endpoint in issues['accepted_invalid'][:20]:
        report.append(f"- {endpoint}\n")
    if len(issues['accepted_invalid']) > 20:
        report.append(f"- ... and {len(issues['accepted_invalid']) - 20} more\n")
    report.append("\n")
    
    # Rejected Valid
    report.append(f"## 4. API Rejected Valid Requests - {len(issues['rejected_valid'])} issues\n\n")
    for endpoint in issues['rejected_valid'][:20]:
        report.append(f"- {endpoint}\n")
    if len(issues['rejected_valid']) > 20:
        report.append(f"- ... and {len(issues['rejected_valid']) - 20} more\n")
    report.append("\n")
    
    # Undocumented Status Codes
    report.append(f"## 5. Undocumented Status Codes - {len(issues['undocumented_status'])} issues\n\n")
    
    # Group by status code
    status_groups = defaultdict(list)
    for item in issues['undocumented_status']:
        status_groups[item['status']].append(item['endpoint'])
    
    for status, endpoints in sorted(status_groups.items()):
        report.append(f"### Status {status} - {len(endpoints)} endpoints\n")
        for ep in endpoints[:10]:
            report.append(f"- {ep}\n")
        if len(endpoints) > 10:
            report.append(f"- ... and {len(endpoints) - 10} more\n")
        report.append("\n")
    
    # Summary
    report.append("## Summary\n\n")
    report.append(f"- **Total Server Errors:** {len(issues['server_errors'])}\n")
    report.append(f"- **Total Schema Violations:** {len(issues['schema_violations'])}\n")
    report.append(f"- **Total Accepted Invalid:** {len(issues['accepted_invalid'])}\n")
    report.append(f"- **Total Rejected Valid:** {len(issues['rejected_valid'])}\n")
    report.append(f"- **Total Undocumented Status:** {len(issues['undocumented_status'])}\n")
    
    return ''.join(report)

if __name__ == "__main__":
    print("📊 Analyzing Schemathesis results...")
    issues = parse_log_file('schemathesis_final_test.log')
    
    print("Found:")
    print(f"  - {len(issues['server_errors'])} server errors")
    print(f"  - {len(issues['schema_violations'])} schema violations")
    print(f"  - {len(issues['accepted_invalid'])} accepted invalid requests")
    print(f"  - {len(issues['rejected_valid'])} rejected valid requests")
    print(f"  - {len(issues['undocumented_status'])} undocumented status codes")
    
    report = generate_report(issues)
    
    with open('SCHEMATHESIS_DETAILED_REPORT.md', 'w') as f:
        f.write(report)
    
    print("\n✅ Report generated: SCHEMATHESIS_DETAILED_REPORT.md")
