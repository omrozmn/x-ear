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
            
            if 'operationId' in auto_op and auto_op['operationId'] != manual_op.get('operationId'):
                print(f"   ✏️  {path} [{method}]: {manual_op.get('operationId')} → {auto_op['operationId']}")
                merged['paths'][path][method]['operationId'] = auto_op['operationId']
        
        # Add new methods from auto-generated
        for method in auto_methods - manual_methods:
            print(f"   + {path} [{method}]")
            merged['paths'][path][method] = auto_spec['paths'][path][method]
    
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
    
    print("🔄 Merging OpenAPI specs...")
    print(f"   Manual (base): {manual_path}")
    print(f"   Auto-generated: {auto_path}")
    print(f"   Output: {output_path}")
    print()
    
    manual = load_yaml(manual_path)
    auto = load_yaml(auto_path)
    
    merged = merge_specs(manual, auto)
    
    # Update metadata
    merged['info']['title'] = 'X-Ear CRM API'
    merged['info']['version'] = '1.0.0'
    merged['info']['description'] = 'Merged: manual schemas + auto-generated endpoints'
    
    save_yaml(merged, output_path)
    
    print()
    print(f"✅ Merged spec saved to {output_path}")
    print(f"   Total paths: {len(merged['paths'])}")
    print(f"   Total tags: {len(merged.get('tags', []))}")

if __name__ == '__main__':
    main()
