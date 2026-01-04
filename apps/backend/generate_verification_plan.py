import sys
import os
import json
from collections import defaultdict

# Add current directory to path
sys.path.append(os.getcwd())

try:
    from app import app
    
    # 1. Collect Routes
    blueprints = defaultdict(list)
    
    for rule in app.url_map.iter_rules():
        if rule.endpoint == 'static':
            continue
            
        methods = list(rule.methods - {'HEAD', 'OPTIONS'})
        if not methods:
            continue
            
        # Determine group
        parts = rule.endpoint.split('.')
        group = parts[0] if len(parts) > 1 else 'default'
        
        # Format for table
        for method in methods:
            blueprints[group].append({
                "method": method,
                "path": rule.rule,
                "endpoint": rule.endpoint,
                # Try to guess auth requirement ? (Hard without inspecting decorators generically)
                "auth": "❓ (Check Code)" 
            })

    # 2. Generate Markdown
    md_lines = []
    md_lines.append("# Comprehensive API Verification Plan")
    md_lines.append("")
    md_lines.append("This document lists all detected API endpoints in the backend.")
    md_lines.append("Use this checklist to verify each endpoint using `curl`.")
    md_lines.append("")
    md_lines.append("## Prerequisites")
    md_lines.append("- **Base URL**: `http://localhost:5003` (or your dev server port)")
    md_lines.append("- **Auth Token**: Most endpoints require a Bearer token.")
    md_lines.append("  ```bash")
    md_lines.append("  # Get Token")
    md_lines.append("  TOKEN=$(curl -X POST http://localhost:5003/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"admin@example.com\", \"password\":\"password\"}' | jq -r .access_token)")
    md_lines.append("  ```")
    md_lines.append("")
    md_lines.append("## Generic Test Command")
    md_lines.append("```bash")
    md_lines.append("curl -X <METHOD> http://localhost:5003<PATH> \\")
    md_lines.append("  -H \"Authorization: Bearer $TOKEN\" \\")
    md_lines.append("  -H \"Content-Type: application/json\"")
    md_lines.append("```")
    md_lines.append("")
    md_lines.append("## Endpoint Checklist")
    md_lines.append("")

    # Sort groups
    sorted_groups = sorted(blueprints.keys())
    
    for group in sorted_groups:
        routes = blueprints[group]
        # Sort routes by path then method
        routes.sort(key=lambda x: (x['path'], x['method']))
        
        md_lines.append(f"### Module: `{group}`")
        md_lines.append("| Method | Path | Endpoint Function | Tested? | Frontend Match? |")
        md_lines.append("| :--- | :--- | :--- | :---: | :---: |")
        
        for r in routes:
            # Escape pipes if any (unlikely in paths but safe practice)
            path = r['path'].replace('|', '\|')
            md_lines.append(f"| **{r['method']}** | `{path}` | `{r['endpoint']}` | [ ] | [ ] |")
        
        md_lines.append("")
        
    with open('api_verification_plan.md', 'w') as f:
        f.write('\n'.join(md_lines))
        
    print("Successfully generated api_verification_plan.md")

except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc()
