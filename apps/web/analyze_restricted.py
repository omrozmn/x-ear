
import re
from collections import Counter

def find_restricted_syntax_files(report_path):
    current_file = None
    file_counts = Counter()
    
    with open(report_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line.startswith('/') and 'x-ear' in line:
                current_file = line
            elif 'no-restricted-syntax' in line:
                if current_file:
                    file_counts[current_file] += 1

    print("Files with 'no-restricted-syntax' errors:")
    print("-" * 50)
    for file_path, count in file_counts.most_common(20):
        # Shorten path for readability
        short_path = file_path.split('apps/web/')[-1]
        print(f"{count: <4} | {short_path}")

find_restricted_syntax_files('lint_report.txt')
