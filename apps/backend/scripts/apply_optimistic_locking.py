#!/usr/bin/env python3
"""
Script to apply optimistic locking and transaction decorators to PUT endpoints
"""

import os
import re
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

def find_put_endpoints(file_path):
    """Find PUT endpoints in a Python file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find PUT route definitions
    put_pattern = r'@\w+_bp\.route\([^)]*methods=\[[^\]]*[\'"]PUT[\'"][^\]]*\]\)'
    matches = re.finditer(put_pattern, content, re.MULTILINE)
    
    endpoints = []
    for match in matches:
        start_pos = match.start()
        # Find the function definition that follows
        func_pattern = r'def\s+(\w+)\s*\([^)]*\):'
        func_match = re.search(func_pattern, content[start_pos:])
        if func_match:
            func_name = func_match.group(1)
            endpoints.append({
                'route_match': match,
                'function_name': func_name,
                'start_pos': start_pos
            })
    
    return endpoints

def has_optimistic_lock_import(content):
    """Check if file already imports optimistic locking utilities"""
    return 'from utils.optimistic_locking import' in content

def has_optimistic_lock_decorator(content, func_name):
    """Check if function already has optimistic_lock decorator"""
    # Look for the function and check decorators above it
    func_pattern = rf'def\s+{func_name}\s*\([^)]*\):'
    func_match = re.search(func_pattern, content)
    if not func_match:
        return False
    
    # Get content before function definition
    before_func = content[:func_match.start()]
    lines = before_func.split('\n')
    
    # Look at the last few lines for decorators
    for i in range(min(10, len(lines))):
        line = lines[-(i+1)].strip()
        if '@optimistic_lock' in line:
            return True
        if not line.startswith('@') and line and not line.startswith('def'):
            break
    
    return False

def add_imports(content):
    """Add optimistic locking imports if not present"""
    if has_optimistic_lock_import(content):
        return content
    
    # Find existing utils imports
    utils_import_pattern = r'from utils\.\w+ import'
    matches = list(re.finditer(utils_import_pattern, content))
    
    if matches:
        # Add after last utils import
        last_match = matches[-1]
        insert_pos = content.find('\n', last_match.end()) + 1
        new_import = 'from utils.optimistic_locking import optimistic_lock, with_transaction\n'
        return content[:insert_pos] + new_import + content[insert_pos:]
    else:
        # Find imports section and add at the end
        import_pattern = r'from \w+.*import.*\n'
        matches = list(re.finditer(import_pattern, content))
        if matches:
            last_match = matches[-1]
            insert_pos = last_match.end()
            new_import = 'from utils.optimistic_locking import optimistic_lock, with_transaction\n'
            return content[:insert_pos] + new_import + content[insert_pos:]
    
    return content

def get_model_name_from_function(content, func_name):
    """Try to determine the model name from function content"""
    func_pattern = rf'def\s+{func_name}\s*\([^)]*\):(.*?)(?=def\s+\w+|$)'
    func_match = re.search(func_pattern, content, re.DOTALL)
    if not func_match:
        return None
    
    func_content = func_match.group(1)
    
    # Common patterns for model access
    patterns = [
        r'db\.session\.get\((\w+),',
        r'(\w+)\.query\.get\(',
        r'(\w+)\.query\.filter',
        r'from models\.(\w+) import (\w+)',
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, func_content)
        if matches:
            if isinstance(matches[0], tuple):
                return matches[0][-1]  # Last element of tuple
            return matches[0]
    
    return None

def add_decorators_to_function(content, func_name, model_name=None, id_param=None):
    """Add optimistic_lock and with_transaction decorators to a function"""
    if has_optimistic_lock_decorator(content, func_name):
        return content
    
    func_pattern = rf'(def\s+{func_name}\s*\([^)]*\):)'
    func_match = re.search(func_pattern, content)
    if not func_match:
        return content
    
    # Find the line before the function definition
    before_func = content[:func_match.start()]
    lines_before = before_func.split('\n')
    
    # Find where to insert decorators (after existing decorators)
    insert_line_idx = len(lines_before) - 1
    while insert_line_idx >= 0 and lines_before[insert_line_idx].strip().startswith('@'):
        insert_line_idx -= 1
    insert_line_idx += 1
    
    # Prepare decorators
    decorators = []
    if model_name and id_param:
        decorators.append(f'@optimistic_lock({model_name}, id_param=\'{id_param}\')')
    decorators.append('@with_transaction')
    
    # Insert decorators
    for i, decorator in enumerate(decorators):
        lines_before.insert(insert_line_idx + i, decorator)
    
    # Reconstruct content
    new_before = '\n'.join(lines_before)
    return new_before + content[func_match.start():]

def process_file(file_path):
    """Process a single Python file"""
    print(f"Processing {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Add imports
    content = add_imports(content)
    
    # Find PUT endpoints
    endpoints = find_put_endpoints(content)
    
    if not endpoints:
        print(f"  No PUT endpoints found")
        return
    
    print(f"  Found {len(endpoints)} PUT endpoints")
    
    # Process each endpoint
    for endpoint in endpoints:
        func_name = endpoint['function_name']
        print(f"    Processing function: {func_name}")
        
        # Try to determine model and id parameter
        model_name = get_model_name_from_function(content, func_name)
        
        # Common id parameter patterns
        id_param = None
        if 'user_id' in func_name or '<user_id>' in str(endpoint['route_match'].group()):
            id_param = 'user_id'
        elif 'patient_id' in func_name or '<patient_id>' in str(endpoint['route_match'].group()):
            id_param = 'patient_id'
        elif 'supplier_id' in func_name or '<supplier_id>' in str(endpoint['route_match'].group()):
            id_param = 'supplier_id'
        elif 'device_id' in func_name or '<device_id>' in str(endpoint['route_match'].group()):
            id_param = 'device_id'
        elif 'item_id' in func_name or '<item_id>' in str(endpoint['route_match'].group()):
            id_param = 'item_id'
        elif 'app_id' in func_name or '<app_id>' in str(endpoint['route_match'].group()):
            id_param = 'app_id'
        elif 'appointment_id' in func_name or '<appointment_id>' in str(endpoint['route_match'].group()):
            id_param = 'appointment_id'
        elif 'notification_id' in func_name or '<notification_id>' in str(endpoint['route_match'].group()):
            id_param = 'notification_id'
        
        print(f"      Model: {model_name}, ID param: {id_param}")
        
        # Add decorators
        content = add_decorators_to_function(content, func_name, model_name, id_param)
    
    # Write back if changed
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✓ Updated {file_path}")
    else:
        print(f"  - No changes needed for {file_path}")

def main():
    """Main function"""
    routes_dir = backend_dir / 'routes'
    
    if not routes_dir.exists():
        print(f"Routes directory not found: {routes_dir}")
        return
    
    # Process all Python files in routes directory
    for py_file in routes_dir.glob('*.py'):
        if py_file.name == '__init__.py':
            continue
        
        try:
            process_file(py_file)
        except Exception as e:
            print(f"Error processing {py_file}: {e}")
    
    print("\nDone!")

if __name__ == '__main__':
    main()