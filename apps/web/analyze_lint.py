
import json
import os
import sys
from collections import defaultdict

def analyze_lint_report(file_path):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    with open(file_path, 'r') as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            print("Invalid JSON")
            return

    rule_counts = defaultdict(int)
    file_counts = defaultdict(int)
    category_counts = defaultdict(int)
    severity_counts = defaultdict(int)
    
    # Custom category mapping based on rule names
    def classify_rule(rule_id):
        if not rule_id: return "Unknown"
        if "any" in rule_id or "unsafe" in rule_id or "ban-ts-comment" in rule_id: return "Type Safety"
        if "unused" in rule_id: return "Unused Code"
        if "react" in rule_id or "hooks" in rule_id: return "React/Hooks"
        if "import" in rule_id: return "Imports"
        if "prettier" in rule_id or "style" in rule_id: return "Style"
        if "await" in rule_id or "promise" in rule_id: return "Async/Await"
        return "Other"

    def classify_location(file_path):
        if "/src/legacy" in file_path: return "legacy"
        if "/src/api" in file_path or "/src/services" in file_path: return "api/services"
        if "/src/pages" in file_path: return "pages"
        if "/src/components" in file_path: return "components"
        if "/src/hooks" in file_path: return "hooks"
        if "/src/utils" in file_path: return "utils"
        if "/src/types" in file_path: return "types"
        if "test" in file_path or "spec" in file_path: return "tests"
        if "apps/web" in file_path: return "apps/web (root/misc)"
        return "other"

    total_errors = 0
    restricted_syntax_samples = []
    
    for file_item in data:
        file_path = file_item.get("filePath", "")
        messages = file_item.get("messages", [])
        
        location = classify_location(file_path)
        
        for msg in messages:
            rule_id = msg.get("ruleId", "unknown")
            severity = msg.get("severity", 0) # 1 warning, 2 error
            message_text = msg.get("message", "")
            
            if rule_id == "no-restricted-syntax" and len(restricted_syntax_samples) < 5:
                restricted_syntax_samples.append(f"{file_path}: {message_text}")
            
            rule_counts[rule_id] += 1
            file_counts[location] += 1
            category = classify_rule(rule_id)
            category_counts[category] += 1
            severity_counts[severity] += 1
            total_errors += 1

    print(f"Total Lint Errors/Warnings: {total_errors}")
    print("\n--- By Category ---")
    for cat, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"{cat}: {count} ({count/total_errors*100:.1f}%)")

    print("\n--- By Rule (Top 10) ---")
    for rule, count in sorted(rule_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"{rule}: {count}")

    print("\n--- By Location ---")
    for loc, count in sorted(file_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"{loc}: {count}")
        
    print("\n--- React Hook Errors ---")
    for file_item in data:
        file_path = file_item.get("filePath", "")
        for msg in file_item.get("messages", []):
            if msg.get("ruleId") == "react-hooks/exhaustive-deps":
                 print(f"{file_path}:{msg.get('line')}")

if __name__ == "__main__":
    analyze_lint_report("lint-report.json")
