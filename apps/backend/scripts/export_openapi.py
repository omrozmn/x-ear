#!/usr/bin/env python3
"""
Export OpenAPI Schema from FastAPI
Generates openapi.json with full schema definitions

Usage:
  - Local: python scripts/export_openapi.py
  - CI: python scripts/export_openapi.py --output ../../openapi.json
"""
import sys
import os
import json
import argparse

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app


def export_openapi(output_path: str = None):
    """Export OpenAPI schema to JSON file"""
    openapi_schema = app.openapi()

    # Default output path
    if output_path is None:
        output_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "openapi.json",
        )

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, indent=2, ensure_ascii=False, default=str)

    # Stats
    paths_count = len(openapi_schema.get("paths", {}))
    schemas_count = len(openapi_schema.get("components", {}).get("schemas", {}))

    print(f"✅ OpenAPI schema exported to: {output_path}")
    print(f"   Paths: {paths_count}")
    print(f"   Schemas: {schemas_count}")

    return openapi_schema


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export OpenAPI schema")
    parser.add_argument("--output", "-o", help="Output file path")
    args = parser.parse_args()

    export_openapi(args.output)
