#!/usr/bin/env python3
"""
Add explicit operation_id to all FastAPI endpoints.
This ensures Orval generates consistent hook names.
"""
import json
import re
import os
from pathlib import Path

# Load operation IDs from openapi.json
BACKEND_DIR = Path(__file__).parent.parent
OPENAPI_PATH = BACKEND_DIR / "openapi.json"
ROUTERS_DIR = BACKEND_DIR / "routers"

def load_operation_ids():
    """Load operation IDs from openapi.json"""
    with open(OPENAPI_PATH) as f:
        spec = json.load(f)
    
    ops = {}
    for path, methods in spec['paths'].items():
        for method, details in methods.items():
            if method in ['get', 'post', 'put', 'patch', 'delete']:
                op_id = details.get('operationId', '')
                if op_id:
                    # Store multiple variations for matching
                    key = f'{method.upper()}:{path}'
                    ops[key] = op_id
                    
                    # Also store without /api prefix
                    if path.startswith('/api'):
                        clean_path = path[4:]  # Remove /api
                        ops[f'{method.upper()}:{clean_path}'] = op_id
    return ops

def find_router_prefix(content):
    """Find the router prefix from APIRouter definition"""
    # Look for prefix in APIRouter()
    match = re.search(r'APIRouter\s*\([^)]*prefix\s*=\s*["\']([^"\']+)["\']', content)
    if match:
        return match.group(1)
    return ""

def process_router_file(filepath, operation_ids):
    """Process a single router file and add operation_ids"""
    with open(filepath, 'r') as f:
        content = f.read()
    
    original_content = content
    prefix = find_router_prefix(content)
    
    # Pattern to match @router.method("/path", ...) or @router.method("/path")
    decorator_pattern = re.compile(
        r'@router\.(get|post|put|patch|delete)\s*\(\s*["\']([^"\']+)["\']([^)]*)\)',
        re.MULTILINE
    )
    
    modifications = []
    
    for match in decorator_pattern.finditer(content):
        method = match.group(1).upper()
        path = match.group(2)
        existing_params = match.group(3)
        
        # Skip if already has operation_id
        if 'operation_id' in existing_params:
            continue
        
        # Build full path for lookup - try multiple variations
        full_path = prefix + path
        
        # Try different path variations
        lookup_keys = [
            f'{method}:{full_path}',
            f'{method}:/api{full_path}',
            f'{method}:{full_path.rstrip("/")}',
            f'{method}:/api{full_path.rstrip("/")}',
        ]
        
        op_id = None
        for key in lookup_keys:
            if key in operation_ids:
                op_id = operation_ids[key]
                break
        
        if op_id:
            modifications.append({
                'start': match.start(),
                'end': match.end(),
                'method': method.lower(),
                'path': path,
                'existing_params': existing_params,
                'operation_id': op_id
            })
    
    # Apply modifications in reverse order to preserve positions
    for mod in reversed(modifications):
        existing = mod['existing_params'].strip()
        if existing:
            # Has existing params, add operation_id
            if existing.startswith(','):
                new_params = f', operation_id="{mod["operation_id"]}"{existing}'
            else:
                new_params = f', operation_id="{mod["operation_id"]}", {existing.lstrip(", ")}'
        else:
            new_params = f', operation_id="{mod["operation_id"]}"'
        
        new_decorator = f'@router.{mod["method"]}("{mod["path"]}"{new_params})'
        content = content[:mod['start']] + new_decorator + content[mod['end']:]
    
    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        return len(modifications)
    return 0

def main():
    print("Loading operation IDs from openapi.json...")
    operation_ids = load_operation_ids()
    print(f"Found {len(operation_ids)} operation ID mappings")
    
    total_modified = 0
    files_modified = 0
    
    for router_file in ROUTERS_DIR.glob("*.py"):
        if router_file.name.startswith("__"):
            continue
        
        count = process_router_file(router_file, operation_ids)
        if count > 0:
            print(f"  {router_file.name}: {count} endpoints updated")
            total_modified += count
            files_modified += 1
    
    print(f"\nTotal: {total_modified} endpoints in {files_modified} files")

if __name__ == "__main__":
    main()
