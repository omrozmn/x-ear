
import sys
import os
import json
from pathlib import Path

# Add the api directory to the path to find main
api_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(api_dir))

# Mock environment variables needed for main/config
os.environ['JWT_SECRET_KEY'] = 'dev-secret'
os.environ['DATABASE_URL'] = 'sqlite:///:memory:' 

try:
    from main import app
    
    # Generate schema
    openapi_schema = app.openapi()
    
    # Output to file
    output_path = api_dir / 'openapi_generated.json'
    with open(output_path, 'w') as f:
        json.dump(openapi_schema, f, indent=2)
        
    print(f"OpenAPI spec dumped to {output_path}")
except Exception as e:
    print(f"Error generating schema: {e}", file=sys.stderr)
    sys.exit(1)
