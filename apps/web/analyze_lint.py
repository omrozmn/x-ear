
import re
from collections import Counter

def analyze_lint_report(file_path):
    rule_counts = Counter()
    total_errors = 0
    
    with open(file_path, 'r') as f:
        for line in f:
            # Typical eslint output line:
            #   222:18  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
            # Match lines that usually contain "error" or "warning" followed by a message and a rule name
            match = re.search(r'\s+(error|warning)\s+.*\s+([@a-z0-9\-\/]+)$', line.strip())
            if match:
                rule_name = match.group(2)
                rule_counts[rule_name] += 1
                total_errors += 1

    print(f"Total Issues Found: {total_errors}")
    print("-" * 30)
    print(f"{'Count':<10} | {'Rule Name'}")
    print("-" * 30)
    for rule, count in rule_counts.most_common():
        print(f"{count:<10} | {rule}")

if __name__ == "__main__":
    analyze_lint_report('lint_report.txt')
