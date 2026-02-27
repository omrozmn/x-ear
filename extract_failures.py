#!/usr/bin/env python3
import re

failures = []
current_endpoint = None

with open('/tmp/test_output.log', 'r') as f:
    for line in f:
        # Extract endpoint being tested
        if 'Testing' in line and '] Testing' in line:
            match = re.search(r'\[(\d+)/513\] Testing (\w+) (.+)', line)
            if match:
                current_endpoint = {
                    'num': match.group(1),
                    'method': match.group(2),
                    'path': match.group(3).strip()
                }
        
        # Extract failure
        if '✗ Failed' in line and current_endpoint:
            match = re.search(r'✗ Failed \((\d+)\): (.+)', line)
            if match:
                failures.append({
                    **current_endpoint,
                    'status': match.group(1),
                    'error': match.group(2).strip()
                })
                current_endpoint = None

# Group by status code
by_status = {}
for f in failures:
    status = f['status']
    if status not in by_status:
        by_status[status] = []
    by_status[status].append(f)

# Print summary
print(f"Total failures: {len(failures)}\n")
for status in sorted(by_status.keys(), key=lambda x: -len(by_status[x])):
    print(f"\n{'='*80}")
    print(f"STATUS {status}: {len(by_status[status])} failures")
    print('='*80)
    for f in by_status[status][:10]:  # First 10 of each
        print(f"{f['num']}. {f['method']} {f['path']}")
        print(f"   Error: {f['error'][:100]}")
