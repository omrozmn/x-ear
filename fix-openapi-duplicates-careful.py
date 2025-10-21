#!/usr/bin/env python3

import yaml
import re
from collections import OrderedDict

def represent_ordereddict(dumper, data):
    return dumper.represent_mapping('tag:yaml.org,2002:map', data.items())

yaml.add_representer(OrderedDict, represent_ordereddict)

# Read the OpenAPI file
with open('openapi.yaml', 'r') as f:
    content = f.read()

# Load YAML while preserving order
data = yaml.safe_load(content)

def remove_snake_case_aliases(obj, path=""):
    """Recursively remove snake_case alias properties"""
    if isinstance(obj, dict):
        keys_to_remove = []
        for key, value in obj.items():
            current_path = f"{path}.{key}" if path else key
            
            # Check if this is a snake_case alias property
            if isinstance(value, dict) and 'description' in value:
                desc = value.get('description', '')
                if 'snake_case alias' in desc:
                    keys_to_remove.append(key)
                    print(f"Removing snake_case alias: {current_path}")
                else:
                    remove_snake_case_aliases(value, current_path)
            else:
                remove_snake_case_aliases(value, current_path)
        
        # Remove the identified keys
        for key in keys_to_remove:
            del obj[key]
    
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            remove_snake_case_aliases(item, f"{path}[{i}]")

# Remove snake_case aliases
print("Removing snake_case alias properties...")
remove_snake_case_aliases(data)

# Write back to file
with open('openapi.yaml', 'w') as f:
    yaml.dump(data, f, default_flow_style=False, sort_keys=False, width=1000)

print("✅ Successfully removed snake_case alias properties from OpenAPI spec")