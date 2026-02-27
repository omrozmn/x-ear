#!/usr/bin/env python3
"""
Fix Python 3.10 syntax issues - replace str | None with Optional[str]
"""
import re
from pathlib import Path
from typing import List

def fix_union_syntax(file_path: Path) -> bool:
    """Replace str | None with Optional[str] for Python 3.10 compatibility"""
    content = file_path.read_text()
    original = content
    
    # Check if Optional is imported
    has_optional = 'from typing import' in content and 'Optional' in content
    
    # Replace union syntax with Optional
    # Pattern: type | None
    content = re.sub(
        r'\b(\w+)\s*\|\s*None\b',
        r'Optional[\1]',
        content
    )
    
    # If we made changes and Optional is not imported, add it
    if content != original and not has_optional:
        # Find typing import line
        typing_import = re.search(r'from typing import ([^\n]+)', content)
        if typing_import:
            # Add Optional to existing import
            imports = typing_import.group(1)
            if 'Optional' not in imports:
                new_imports = imports.rstrip() + ', Optional'
                content = content.replace(
                    f'from typing import {imports}',
                    f'from typing import {new_imports}'
                )
        else:
            # Add new typing import after other imports
            lines = content.split('\n')
            import_idx = 0
            for i, line in enumerate(lines):
                if line.startswith('from ') or line.startswith('import '):
                    import_idx = i + 1
            lines.insert(import_idx, 'from typing import Optional')
            content = '\n'.join(lines)
    
    if content != original:
        file_path.write_text(content)
        return True
    return False

def main():
    print("🔧 Fixing Python 3.10 syntax issues...")
    
    routers_dir = Path('apps/api/routers')
    schemas_dir = Path('apps/api/schemas')
    services_dir = Path('apps/api/services')
    
    all_files = list(routers_dir.glob('*.py')) + list(schemas_dir.glob('*.py')) + list(services_dir.glob('*.py'))
    
    fixed = 0
    for file_path in all_files:
        if fix_union_syntax(file_path):
            fixed += 1
            print(f"  ✓ {file_path.name}")
    
    print(f"\n✅ Fixed {fixed} files")

if __name__ == "__main__":
    main()
