import sys
import os
import json

# Add current directory to path so imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from main import app
except ImportError as e:
    print(f"Error importing main: {e}")
    sys.exit(1)

def dump():
    try:
        openapi_data = app.openapi()
        # Output to apps/admin/openapi.json
        # Go up two levels from apps/backend to root, then down to apps/admin
        output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../admin'))
        if not os.path.exists(output_dir):
            print(f"Directory not found: {output_dir}")
            # Fallback to current dir
            output_dir = os.path.dirname(os.path.abspath(__file__))
            
        output_path = os.path.join(output_dir, 'openapi.json')
        
        with open(output_path, 'w') as f:
            json.dump(openapi_data, f, indent=2)
        print(f"OpenAPI spec dumped to {output_path}")
    except Exception as e:
        print(f"Error dumping openapi: {e}")
        sys.exit(1)

if __name__ == "__main__":
    dump()
