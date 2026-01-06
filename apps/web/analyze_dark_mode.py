import os
import re

def analyze_dark_mode(directory):
    missing_dark_mode = []
    
    # Patterns to look for (simplified)
    # We look for specific light mode classes that typically require a dark mode counterpart
    patterns = [
        (r'bg-white', r'dark:bg-'),
        (r'bg-gray-[5-9]00', r'dark:bg-'), # mostly for text, but if used as bg
        (r'text-gray-900', r'dark:text-'),
        (r'text-gray-800', r'dark:text-'),
        (r'has-background', r'dark:'), # minimal check
        (r'border-gray-200', r'dark:border-'),
        (r'border-gray-300', r'dark:border-'),
    ]
    
    # Walk through the directory
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.jsx'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                    issues = []
                    lines = content.split('\n')
                    
                    # Heuristic: simple check per file first, or we can check per line
                    # Checking per line is better for locality
                    for i, line in enumerate(lines):
                        for light_class, dark_prefix in patterns:
                            # If line has light class but NOT the dark prefix (approximate)
                            # This is a bit loose because `dark:` might be on a different line in a long formatting
                            if light_class in line and dark_prefix not in line:
                                # Double check if it's not multiline string
                                # Check if 'dark:' exists in the surrounding lines (simple context check)
                                context_start = max(0, i - 1)
                                context_end = min(len(lines), i + 2)
                                context = "".join(lines[context_start:context_end])
                                
                                if dark_prefix not in context:
                                     issues.append(f"Line {i+1}: Found '{light_class}' but missing '{dark_prefix}'")
                    
                    if issues:
                        missing_dark_mode.append({'file': file_path, 'issues': issues})
                        
                except Exception as e:
                    print(f"Could not read {file_path}: {e}")

    return missing_dark_mode

if __name__ == "__main__":
    target_dir = "/Users/omerozmen/Desktop/x-ear web app/x-ear/apps/web/src"
    results = analyze_dark_mode(target_dir)
    
    print(f"Found {len(results)} files with potential dark mode issues.\n")
    
    for item in results:
        print(f"File: {item['file']}")
        # Print only first 3 issues to keep output clean, valid for LLM context
        for issue in item['issues'][:3]:
            print(f"  - {issue}")
        if len(item['issues']) > 3:
            print(f"  - ... and {len(item['issues']) - 3} more issues")
        print("-" * 40)
