#!/usr/bin/env python3
"""
Generate a minimal OpenAPI spec from Flask app routes.
This script inspects `backend.app.app.url_map` and emits a deterministic
OpenAPI YAML document with basic paths, operations and path parameters.

Usage:
  python backend/scripts/generate_openapi.py --output ../openapi.generated.yaml

By default it will write to ../openapi.generated.yaml so you can diff it with
the committed `openapi.yaml` to detect drift.
"""
import re
import os
import argparse
from collections import defaultdict

import yaml

# Import the Flask app
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from app import app

IGNORED_ENDPOINTS = set([
    'static',
])


def openapi_path_from_rule(rule):
    # Convert Flask rule <param> to OpenAPI {param}
    return re.sub(r"<([^:>]+:)?([^>]+)>", r"{\2}", rule)


def extract_path_params(rule):
    params = re.findall(r"<([^:>]+:)?([^>]+)>", rule)
    return [p[1] for p in params]


def tag_from_rule(rule):
    # tag by first path segment after /api/ if present
    parts = rule.strip('/').split('/')
    if len(parts) >= 2 and parts[0] == 'api':
        return parts[1].capitalize()
    if parts:
        return parts[0].capitalize()
    return 'Default'


def endpoint_to_camel_case(endpoint):
    """Convert blueprint.function_name to camelCase operationId with REST conventions"""
    # Remove _bp suffix from blueprint name
    parts = endpoint.split('.')
    if len(parts) == 2:
        blueprint, func = parts
        # Remove _bp suffix
        blueprint = blueprint.replace('_bp', '')
        
        # Normalize function names to REST conventions
        # list_patients → get_patients (list = GET collection)
        # get_patient → get_patient (get = GET single)
        func = normalize_function_name(func)
        
        # Convert to camelCase: sales_bp.create_sale -> salesCreateSale
        blueprint_camel = to_camel_case(blueprint)
        func_camel = to_camel_case(func, capitalize_first=True)
        return blueprint_camel + func_camel
    else:
        # Fallback: convert full endpoint name to camelCase
        # This ensures uniqueness for non-blueprint endpoints
        return to_camel_case(endpoint.replace('.', '_'), capitalize_first=False)


def normalize_function_name(func_name):
    """Normalize function names to REST conventions for operationId"""
    # list_* → get_* (collection endpoint)
    if func_name.startswith('list_'):
        return func_name.replace('list_', 'get_', 1)
    
    # fetch_* → get_*
    if func_name.startswith('fetch_'):
        return func_name.replace('fetch_', 'get_', 1)
    
    # retrieve_* → get_*
    if func_name.startswith('retrieve_'):
        return func_name.replace('retrieve_', 'get_', 1)
    
    return func_name


def to_camel_case(text, capitalize_first=False):
    """Convert snake_case to camelCase"""
    parts = text.split('_')
    if not parts:
        return text
    
    if capitalize_first:
        return ''.join(p.capitalize() for p in parts)
    else:
        return parts[0].lower() + ''.join(p.capitalize() for p in parts[1:])


def generate_spec():
    spec = {}
    spec['openapi'] = '3.0.3'
    spec['info'] = {'title': 'X-Ear CRM API (auto-generated)', 'version': '0.0.0-auto'}
    spec['servers'] = [{'url': os.environ.get('API_BASE_URL', 'http://localhost:5003')}]
    paths = {}
    
    # Track operationIds to ensure uniqueness
    operation_ids = {}

    # Iterate URL rules
    for rule in sorted(app.url_map.iter_rules(), key=lambda r: r.rule):
        if rule.endpoint in IGNORED_ENDPOINTS:
            continue
        if str(rule.rule).startswith('/static'):
            continue
        methods = [m for m in rule.methods if m not in ('HEAD', 'OPTIONS')]
        path = openapi_path_from_rule(rule.rule)

        # Get existing operations for this path or create new dict
        operations = paths.get(path, {})
        
        for method in methods:
            # Skip if this method already exists for this path
            if method.lower() in operations:
                continue
                
            op = {}
            # Try to fill summary/description from the view function's docstring
            view_fn = app.view_functions.get(rule.endpoint)
            summary = f'{method} {path}'
            description = None
            if view_fn and getattr(view_fn, '__doc__', None):
                doc = view_fn.__doc__.strip()
                if doc:
                    # First non-empty line → summary, rest → description
                    parts = [ln.strip() for ln in doc.splitlines() if ln.strip()]
                    if parts:
                        summary = parts[0]
                        if len(parts) > 1:
                            description = '\n'.join(parts[1:])

            op['summary'] = summary
            if description:
                op['description'] = description

            # Add operationId to help client generation (camelCase for Orval)
            # Ensure uniqueness by appending counter if duplicate
            base_operation_id = endpoint_to_camel_case(rule.endpoint)
            operation_id = base_operation_id
            counter = 1
            while operation_id in operation_ids:
                operation_id = f"{base_operation_id}{counter}"
                counter += 1
            operation_ids[operation_id] = f"{method} {path}"
            op['operationId'] = operation_id

            op['tags'] = [tag_from_rule(rule.rule)]

            # Path params
            path_params = extract_path_params(rule.rule)
            if path_params:
                op['parameters'] = []
                for p in path_params:
                    op['parameters'].append({
                        'name': p,
                        'in': 'path',
                        'required': True,
                        'schema': {'type': 'string'},
                    })

            # Generic request/response placeholders
            if method in ('POST', 'PUT'):
                op['requestBody'] = {'required': False, 'content': {'application/json': {'schema': {'type': 'object'}}}}

            # Minimal responses
            success_code = '200'
            if method == 'POST':
                success_code = '201'
            if method == 'DELETE':
                success_code = '204'

            op['responses'] = {success_code: {'description': 'Success'}}

            operations[method.lower()] = op

        if operations:
            paths[path] = operations

    spec['paths'] = paths
    # Add simple components scaffolding
    spec['components'] = {'schemas': {}}
    return spec


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', '-o', default=os.path.join(os.path.dirname(__file__), '..', '..', 'openapi.generated.yaml'))
    args = parser.parse_args()

    spec = generate_spec()

    # Ensure deterministic YAML ordering and stable formatting
    with open(args.output, 'w', encoding='utf-8') as fh:
        yaml.dump(spec, fh, sort_keys=False, allow_unicode=True, default_flow_style=False, indent=2)

    print('Wrote generated OpenAPI to', args.output)
