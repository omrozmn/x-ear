#!/usr/bin/env python3
"""
Merge auto-generated OpenAPI spec with manual spec:
- Keep manual spec's response schemas (high quality)
- Add missing endpoints from auto-generated spec
- Keep camelCase operationIds from auto-generated
"""

import yaml
import sys
from pathlib import Path

def load_yaml(path):
    with open(path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)

def save_yaml(data, path):
    with open(path, 'w', encoding='utf-8') as f:
        yaml.dump(data, f, sort_keys=False, allow_unicode=True, default_flow_style=False, indent=2)

def merge_specs(manual_spec, auto_spec):
    """Merge auto-generated endpoints into manual spec"""
    
    merged = manual_spec.copy()
    manual_paths = set(manual_spec.get('paths', {}).keys())
    auto_paths = set(auto_spec.get('paths', {}).keys())
    
    # Track all operationIds to detect duplicates
    operation_ids = {}
    
    # First, collect operationIds from manual spec
    for path, methods in manual_spec.get('paths', {}).items():
        for method, operation in methods.items():
            if isinstance(operation, dict) and 'operationId' in operation:
                op_id = operation['operationId']
                operation_ids[op_id] = f"{method.upper()} {path}"
    
    # Find new paths in auto-generated
    new_paths = auto_paths - manual_paths
    
    print(f"📊 Stats:")
    print(f"   Manual spec: {len(manual_paths)} paths")
    print(f"   Auto-generated: {len(auto_paths)} paths")
    print(f"   New paths to add: {len(new_paths)}")
    
    # Add new paths from auto-generated
    if 'paths' not in merged:
        merged['paths'] = {}
    
    for path in new_paths:
        # Check for duplicate operationIds in new paths
        for method, operation in auto_spec['paths'][path].items():
            if isinstance(operation, dict) and 'operationId' in operation:
                op_id = operation['operationId']
                if op_id in operation_ids:
                    # Duplicate found - skip this path
                    print(f"   ⚠️  Skipping {path} [{method}]: duplicate operationId '{op_id}' (already in {operation_ids[op_id]})")
                    continue
                operation_ids[op_id] = f"{method.upper()} {path}"
        
        merged['paths'][path] = auto_spec['paths'][path]
        print(f"   + Added: {path}")
    
    # Update operationIds in existing paths (manual -> camelCase from auto)
    for path in manual_paths & auto_paths:
        manual_methods = set(manual_spec['paths'][path].keys())
        auto_methods = set(auto_spec['paths'][path].keys())
        
        # For matching methods, update operationId if different
        for method in manual_methods & auto_methods:
            manual_op = manual_spec['paths'][path][method]
            auto_op = auto_spec['paths'][path][method]
            
            if not isinstance(manual_op, dict) or not isinstance(auto_op, dict):
                continue
            
            if 'operationId' in auto_op and auto_op['operationId'] != manual_op.get('operationId'):
                old_id = manual_op.get('operationId')
                new_id = auto_op['operationId']
                
                # Check if new operationId would create duplicate
                if new_id in operation_ids and operation_ids[new_id] != f"{method.upper()} {path}":
                    print(f"   ⚠️  Keeping old operationId for {path} [{method}]: {old_id} (new '{new_id}' would duplicate)")
                    continue
                
                print(f"   ✏️  {path} [{method}]: {old_id} → {new_id}")
                merged['paths'][path][method]['operationId'] = new_id
                if old_id:
                    del operation_ids[old_id]
                operation_ids[new_id] = f"{method.upper()} {path}"
        
        # Add new methods from auto-generated
        for method in auto_methods - manual_methods:
            auto_op = auto_spec['paths'][path][method]
            if isinstance(auto_op, dict) and 'operationId' in auto_op:
                op_id = auto_op['operationId']
                if op_id in operation_ids:
                    print(f"   ⚠️  Skipping {path} [{method}]: duplicate operationId '{op_id}'")
                    continue
                operation_ids[op_id] = f"{method.upper()} {path}"
            
            print(f"   + {path} [{method}]")
            merged['paths'][path][method] = auto_op
    
    # Merge tags (keep unique)
    manual_tags = {t['name'] for t in manual_spec.get('tags', [])}
    auto_tags = {t['name'] for t in auto_spec.get('tags', [])}
    new_tags = auto_tags - manual_tags
    
    if new_tags:
        if 'tags' not in merged:
            merged['tags'] = []
        for tag_name in new_tags:
            merged['tags'].append({'name': tag_name})
            print(f"   + Tag: {tag_name}")
    
    return merged

def main():
    base_dir = Path(__file__).parent.parent.parent.parent
    manual_path = base_dir / 'openapi.yaml.backup'
    auto_path = base_dir / 'apps' / 'openapi.generated.yaml'
    output_path = base_dir / 'openapi.yaml'
    
    print("🔄 Generating OpenAPI spec...")
    print(f"   Auto-generated: {auto_path}")
    print(f"   Output: {output_path}")
    print()
    
    # FULL AUTO MODE: Use only auto-generated spec, no manual merge
    auto = load_yaml(auto_path)
    
    # Update metadata
    auto['info']['title'] = 'X-Ear CRM API'
    auto['info']['version'] = '1.0.0'
    auto['info']['description'] = 'Auto-generated from Flask backend routes'
    
    # Add contact info
    auto['info']['contact'] = {
        'name': 'X-Ear Web App Support',
        'email': 'support@x-ear.com',
        'url': 'https://x-ear.com/support'
    }
    
    save_yaml(auto, output_path)
    
    print(f"✅ OpenAPI spec saved to {output_path}")
    print(f"   Total paths: {len(auto['paths'])}")
    print(f"   Total tags: {len(auto.get('tags', []))}")

if __name__ == '__main__':
    main()
