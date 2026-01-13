#!/usr/bin/env python3
"""
Fix all operation_ids to follow best practice naming convention.
Convention: {verb}{Resource}{Action?}
Examples: 
  - GET /patients -> listPatients
  - GET /patients/{id} -> getPatient  
  - POST /patients -> createPatient
  - PUT /patients/{id} -> updatePatient
  - DELETE /patients/{id} -> deletePatient
  - GET /patients/{id}/devices -> listPatientDevices
  - POST /patients/{id}/devices -> createPatientDevice
"""
import re
from pathlib import Path

ROUTERS_DIR = Path(__file__).parent.parent / "routers"

def singularize(word: str) -> str:
    """Simple singularization."""
    if word.endswith('ies'):
        return word[:-3] + 'y'
    if word.endswith('ses') or word.endswith('xes') or word.endswith('ches') or word.endswith('shes'):
        return word[:-2]
    if word.endswith('s') and not word.endswith('ss'):
        return word[:-1]
    return word

def to_pascal_case(text: str) -> str:
    """Convert text to PascalCase."""
    # Handle hyphens and underscores
    words = re.split(r'[-_]', text)
    return ''.join(word.capitalize() for word in words if word)

def generate_operation_id(method: str, path: str, prefix: str) -> str:
    """Generate best practice operation_id from HTTP method and path."""
    method = method.lower()
    full_path = (prefix + path).strip('/')
    
    # Split path into segments, filter out 'api' and path parameters
    segments = []
    has_id_at_end = False
    
    parts = full_path.split('/')
    for i, part in enumerate(parts):
        if part == 'api':
            continue
        if part.startswith('{') and part.endswith('}'):
            # This is a path parameter
            if i == len(parts) - 1:
                has_id_at_end = True
            continue
        segments.append(part)
    
    if not segments:
        return f"{method}Root"
    
    # Determine verb based on method and path structure
    if method == 'get':
        if has_id_at_end:
            verb = 'get'
        else:
            verb = 'list'
    elif method == 'post':
        verb = 'create'
    elif method in ('put', 'patch'):
        verb = 'update'
    elif method == 'delete':
        verb = 'delete'
    else:
        verb = method
    
    # Build resource name
    # For nested resources like /patients/{id}/devices, we want: PatientDevices
    resource_parts = []
    for i, seg in enumerate(segments):
        pascal = to_pascal_case(seg)
        # If this is the last segment and we're doing get/update/delete on single item
        if i == len(segments) - 1 and has_id_at_end and verb in ('get', 'update', 'delete'):
            pascal = singularize(pascal)
        # If this is a parent resource (not last), singularize it
        elif i < len(segments) - 1:
            pascal = singularize(pascal)
        resource_parts.append(pascal)
    
    resource = ''.join(resource_parts)
    
    # Special case: if verb is 'list' and resource is singular, keep it plural
    if verb == 'list' and resource == singularize(resource):
        # Already singular, that's fine for list
        pass
    
    return f"{verb}{resource}"

def process_router_file(filepath: Path) -> tuple[int, list]:
    """Process a single router file and return count and changes."""
    content = filepath.read_text()
    original = content
    
    # Find router prefix
    prefix_match = re.search(r'APIRouter\s*\([^)]*prefix\s*=\s*["\']([^"\']+)["\']', content)
    prefix = prefix_match.group(1) if prefix_match else ""
    
    changes = []
    
    # Pattern to match route decorators
    decorator_pattern = re.compile(
        r'@router\.(get|post|put|patch|delete)\s*\(\s*["\']([^"\']+)["\']([^)]*)\)',
        re.MULTILINE | re.DOTALL
    )
    
    def replace_decorator(match):
        method = match.group(1)
        path = match.group(2)
        params = match.group(3)
        
        # Skip if include_in_schema=False
        if 'include_in_schema=False' in params:
            return match.group(0)
        
        # Generate new operation_id
        new_op_id = generate_operation_id(method, path, prefix)
        
        # Check if already has operation_id
        op_id_match = re.search(r'operation_id\s*=\s*["\']([^"\']+)["\']', params)
        
        if op_id_match:
            old_op_id = op_id_match.group(1)
            if old_op_id != new_op_id:
                changes.append((old_op_id, new_op_id))
                # Replace existing operation_id
                new_params = re.sub(
                    r'operation_id\s*=\s*["\'][^"\']+["\']',
                    f'operation_id="{new_op_id}"',
                    params
                )
            else:
                new_params = params
        else:
            changes.append((None, new_op_id))
            # Add operation_id
            if params.strip():
                # Has other params
                if params.strip().startswith(','):
                    new_params = f', operation_id="{new_op_id}"{params}'
                else:
                    new_params = f', operation_id="{new_op_id}", {params.strip().lstrip(", ")}'
            else:
                new_params = f', operation_id="{new_op_id}"'
        
        return f'@router.{method}("{path}"{new_params})'
    
    content = decorator_pattern.sub(replace_decorator, content)
    
    if content != original:
        filepath.write_text(content)
    
    return len(changes), changes

def main():
    print("Fixing operation_ids to best practice naming convention (v2)...")
    print("Convention: {verb}{Resource} - e.g., listPatients, getPatient, createPatient\n")
    
    total = 0
    files_changed = 0
    
    for router_file in sorted(ROUTERS_DIR.glob("*.py")):
        if router_file.name.startswith("__"):
            continue
        
        count, changes = process_router_file(router_file)
        if count > 0:
            print(f"  {router_file.name}: {count} endpoints")
            total += count
            files_changed += 1
    
    print(f"\nTotal: {total} endpoints in {files_changed} files")

if __name__ == "__main__":
    main()
