#!/usr/bin/env python3
"""
Fix missing typing imports in schema files
"""
import os
import re

def fix_typing_imports(file_path):
    """Fix missing List, Dict imports in a Python file"""
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Check if file uses List or Dict
    uses_list = 'List[' in content
    uses_dict = 'Dict[' in content
    
    if not (uses_list or uses_dict):
        return False
    
    # Check current imports
    has_list_import = re.search(r'from typing import.*List', content)
    has_dict_import = re.search(r'from typing import.*Dict', content)
    
    needs_list = uses_list and not has_list_import
    needs_dict = uses_dict and not has_dict_import
    
    if not (needs_list or needs_dict):
        return False
    
    # Find the typing import line
    typing_import_match = re.search(r'^from typing import (.+)$', content, re.MULTILINE)
    
    if typing_import_match:
        # Update existing typing import
        current_imports = typing_import_match.group(1)
        imports_list = [imp.strip() for imp in current_imports.split(',')]
        
        if needs_list and 'List' not in imports_list:
            imports_list.append('List')
        if needs_dict and 'Dict' not in imports_list:
            imports_list.append('Dict')
        
        new_imports = ', '.join(sorted(imports_list))
        new_line = f'from typing import {new_imports}'
        content = content.replace(typing_import_match.group(0), new_line)
        
    else:
        # Add new typing import after docstring
        imports_to_add = []
        if needs_list:
            imports_to_add.append('List')
        if needs_dict:
            imports_to_add.append('Dict')
        
        new_import = f'from typing import {", ".join(imports_to_add)}'
        
        # Find where to insert (after docstring, before other imports)
        lines = content.split('\n')
        insert_index = 0
        
        # Skip docstring
        in_docstring = False
        for i, line in enumerate(lines):
            if line.strip().startswith('"""') or line.strip().startswith("'''"):
                if not in_docstring:
                    in_docstring = True
                elif line.strip().endswith('"""') or line.strip().endswith("'''"):
                    in_docstring = False
                    insert_index = i + 1
                    break
            elif not in_docstring and line.strip() and not line.startswith('#'):
                insert_index = i
                break
        
        lines.insert(insert_index, new_import)
        content = '\n'.join(lines)
    
    # Write back
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"Fixed imports in {file_path}")
    return True

def main():
    """Fix all schema files"""
    schemas_dir = 'schemas'
    fixed_count = 0
    
    for filename in os.listdir(schemas_dir):
        if filename.endswith('.py') and filename != '__init__.py':
            file_path = os.path.join(schemas_dir, filename)
            if fix_typing_imports(file_path):
                fixed_count += 1
    
    print(f"Fixed {fixed_count} files")

if __name__ == '__main__':
    main()