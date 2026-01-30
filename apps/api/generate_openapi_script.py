import sys
import os
import yaml
import json

# Add project root to sys.path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), "x-ear/apps/api"))

from fastapi.openapi.utils import get_openapi
# Assuming main.py defines `app`
from main import app

# Generate OpenAPI JSON
openapi_data = get_openapi(
    title=app.title,
    version=app.version,
    openapi_version=app.openapi_version,
    description=app.description,
    routes=app.routes,
)

# Dump to YAML
output_path = "x-ear/openapi.yaml"
with open(output_path, "w") as f:
    yaml.dump(openapi_data, f, sort_keys=False)

print(f"OpenAPI spec generated at {output_path}")
