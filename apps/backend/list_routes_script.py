import sys
import os
import json

# Add current directory to path
sys.path.append(os.getcwd())

try:
    from app import app

    routes = []
    for rule in app.url_map.iter_rules():
        # Filter out static routes
        if rule.endpoint == 'static':
            continue
            
        methods = list(rule.methods - {'HEAD', 'OPTIONS'})
        if not methods:
            continue
            
        routes.append({
            "endpoint": rule.endpoint,
            "path": rule.rule,
            "methods": methods
        })

    # Sort by path
    routes.sort(key=lambda x: x['path'])

    print(json.dumps(routes, indent=2))
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc()
