#!/usr/bin/env python3
"""
Fix all operation_ids to follow best practice naming convention.
Convention: {verb}{Resource}{SubResource?}
Examples: listPatients, getPatient, createPatient, updatePatient, deletePatient
"""
import re
from pathlib import Path

ROUTERS_DIR = Path(__file__).parent.parent / "routers"

# Verb mapping based on HTTP method
VERB_MAP = {
    'get': 'get',      # Single resource
    'post': 'create',
    'put': 'update',
    'patch': 'update',
    'delete': 'delete'
}

# For list endpoints (GET without {id})
LIST_VERB = 'list'

def path_to_resource_name(path: str, prefix: str = "") -> str:
    """Convert path to resource name."""
    # Remove prefix
    full_path = prefix + path
    
    # Split and clean
    parts = [p for p in full_path.split('/') if p and not p.startswith('{') and p != 'api']
    
    # Convert to camelCase
    if not parts:
        return ""
    
    result = []
    for i, part in enumerate(parts):
        # Handle hyphens and underscores
        words = re.split(r'[-_]', part)
        for j, word in enumerate(words):
            if i == 0 and j == 0:
                result.append(word.lower())
            else:
                result.append(word.capitalize())
    
    return ''.join(result)

def generate_operation_id(method: str, path: str, prefix: str, func_name: str) -> str:
    """Generate best practice operation_id."""
    method = method.lower()
    full_path = prefix + path
    
    # Check if it's a list endpoint (GET without path parameter at the end)
    is_list = method == 'get' and not path.rstrip('/').endswith('}')
    
    # Check for special patterns
    has_id_param = '{' in path and '}' in path
    
    # Get verb
    if is_list:
        verb = LIST_VERB
    else:
        verb = VERB_MAP.get(method, method)
    
    # Build resource name from path
    resource = path_to_resource_name(path, prefix)
    
    # Handle special cases based on function name hints
    func_lower = func_name.lower()
    
    # Admin endpoints
    if 'admin' in full_path.lower():
        if not resource.lower().startswith('admin'):
            resource = 'Admin' + resource[0].upper() + resource[1:] if resource else 'Admin'
    
    # Special function name patterns
    if 'init' in func_lower and 'db' in func_lower:
        return f"init{resource.capitalize()}Db"
    
    if 'stats' in func_lower or 'statistics' in func_lower:
        return f"get{resource.capitalize()}Stats"
    
    if 'count' in func_lower:
        return f"count{resource.capitalize()}"
    
    if 'search' in func_lower:
        return f"search{resource.capitalize()}"
    
    if 'export' in func_lower:
        return f"export{resource.capitalize()}"
    
    if 'import' in func_lower:
        return f"import{resource.capitalize()}"
    
    if 'sync' in func_lower:
        return f"sync{resource.capitalize()}"
    
    if 'upload' in func_lower:
        return f"upload{resource.capitalize()}"
    
    if 'download' in func_lower:
        return f"download{resource.capitalize()}"
    
    # Build final operation_id
    if resource:
        # Capitalize first letter of resource for camelCase
        resource_cap = resource[0].upper() + resource[1:] if resource else ""
        return f"{verb}{resource_cap}"
    else:
        return f"{verb}{func_name.replace('_', ' ').title().replace(' ', '')}"

def process_router_file(filepath: Path) -> int:
    """Process a single router file."""
    content = filepath.read_text()
    original = content
    
    # Find router prefix
    prefix_match = re.search(r'APIRouter\s*\([^)]*prefix\s*=\s*["\']([^"\']+)["\']', content)
    prefix = prefix_match.group(1) if prefix_match else ""
    
    # Pattern to match decorators with operation_id
    pattern = re.compile(
        r'@router\.(get|post|put|patch|delete)\s*\(\s*["\']([^"\']+)["\']([^)]*operation_id\s*=\s*["\']([^"\']+)["\'][^)]*)\)',
        re.MULTILINE
    )
    
    # Also match decorators without operation_id
    pattern_no_opid = re.compile(
        r'@router\.(get|post|put|patch|delete)\s*\(\s*["\']([^"\']+)["\']([^)]*)\)',
        re.MULTILINE
    )
    
    # Find function names after decorators
    func_pattern = re.compile(r'(?:async\s+)?def\s+(\w+)\s*\(')
    
    modifications = []
    
    for match in pattern_no_opid.finditer(content):
        method = match.group(1)
        path = match.group(2)
        params = match.group(3)
        
        # Find the function name after this decorator
        func_match = func_pattern.search(content, match.end())
        func_name = func_match.group(1) if func_match else "unknown"
        
        # Skip if include_in_schema=False
        if 'include_in_schema=False' in params:
            continue
        
        # Generate new operation_id
        new_op_id = generate_operation_id(method, path, prefix, func_name)
        
        # Check if already has operation_id
        if 'operation_id' in params:
            # Extract current operation_id
            op_id_match = re.search(r'operation_id\s*=\s*["\']([^"\']+)["\']', params)
            if op_id_match:
                current_op_id = op_id_match.group(1)
                # Only update if different
                if current_op_id != new_op_id:
                    modifications.append({
                        'start': match.start(),
                        'end': match.end(),
                        'method': method,
                        'path': path,
                        'params': params,
                        'old_op_id': current_op_id,
                        'new_op_id': new_op_id
                    })
        else:
            # Add operation_id
            modifications.append({
                'start': match.start(),
                'end': match.end(),
                'method': method,
                'path': path,
                'params': params,
                'old_op_id': None,
                'new_op_id': new_op_id
            })
    
    # Apply modifications in reverse order
    for mod in reversed(modifications):
        params = mod['params']
        new_op_id = mod['new_op_id']
        
        if mod['old_op_id']:
            # Replace existing operation_id
            new_params = re.sub(
                r'operation_id\s*=\s*["\'][^"\']+["\']',
                f'operation_id="{new_op_id}"',
                params
            )
        else:
            # Add operation_id
            if params.strip():
                if params.strip().startswith(','):
                    new_params = f', operation_id="{new_op_id}"{params}'
                else:
                    new_params = f', operation_id="{new_op_id}", {params.strip().lstrip(", ")}'
            else:
                new_params = f', operation_id="{new_op_id}"'
        
        new_decorator = f'@router.{mod["method"]}("{mod["path"]}"{new_params})'
        content = content[:mod['start']] + new_decorator + content[mod['end']:]
    
    if content != original:
        filepath.write_text(content)
        return len(modifications)
    return 0

def main():
    print("Fixing operation_ids to best practice naming convention...")
    
    total = 0
    files = 0
    
    for router_file in sorted(ROUTERS_DIR.glob("*.py")):
        if router_file.name.startswith("__"):
            continue
        
        count = process_router_file(router_file)
        if count > 0:
            print(f"  {router_file.name}: {count} endpoints")
            total += count
            files += 1
    
    print(f"\nTotal: {total} endpoints in {files} files")

if __name__ == "__main__":
    main()
