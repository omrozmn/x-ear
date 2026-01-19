import sys
import os
import json

# Add project root and apps/api to path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, 'apps', 'api'))

from apps.api.main import app

def export_openapi():
    openapi_data = app.openapi()
    # Write to file
    with open('apps/web/openapi.json', 'w') as f:
        json.dump(openapi_data, f, indent=2)
    print("Exported openapi.json to apps/web/openapi.json")

if __name__ == "__main__":
    export_openapi()
