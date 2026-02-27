#!/usr/bin/env python3
"""Fix missing imports in model files"""
import re
from pathlib import Path

def fix_imports(file_path: Path):
    content = file_path.read_text()
    original = content
    
    # Check what's needed
    needs_index = 'Index(' in content and 'Index' not in content.split('from sqlalchemy import')[1].split('\n')[0] if 'from sqlalchemy import' in content else 'Index(' in content
    needs_relationship = 'relationship(' in content and 'from sqlalchemy.orm import' not in content
    needs_backref = 'backref(' in content and 'from sqlalchemy.orm import' not in content
    
    # Add Index to sqlalchemy import
    if needs_index and 'from sqlalchemy import' in content:
        content = re.sub(
            r'from sqlalchemy import ([^\n]+)',
            lambda m: f'from sqlalchemy import {m.group(1)}, Index' if 'Index' not in m.group(1) else m.group(0),
            content,
            count=1
        )
    
    # Add relationship/backref to sqlalchemy.orm import
    if (needs_relationship or needs_backref):
        if 'from sqlalchemy.orm import' in content:
            # Add to existing
            imports_to_add = []
            if needs_relationship and 'relationship' not in content.split('from sqlalchemy.orm import')[1].split('\n')[0]:
                imports_to_add.append('relationship')
            if needs_backref and 'backref' not in content.split('from sqlalchemy.orm import')[1].split('\n')[0]:
                imports_to_add.append('backref')
            
            if imports_to_add:
                content = re.sub(
                    r'from sqlalchemy\.orm import ([^\n]+)',
                    lambda m: f'from sqlalchemy.orm import {m.group(1)}, {", ".join(imports_to_add)}',
                    content,
                    count=1
                )
        else:
            # Add new import
            imports = []
            if needs_relationship:
                imports.append('relationship')
            if needs_backref:
                imports.append('backref')
            
            if imports:
                import_line = f'from sqlalchemy.orm import {", ".join(imports)}\n'
                # Find first sqlalchemy import
                match = re.search(r'from sqlalchemy import', content)
                if match:
                    # Add after sqlalchemy import
                    lines = content.split('\n')
                    for i, line in enumerate(lines):
                        if 'from sqlalchemy import' in line:
                            lines.insert(i + 1, import_line.strip())
                            break
                    content = '\n'.join(lines)
    
    if content != original:
        file_path.write_text(content)
        return True
    return False

models_dir = Path('core/models')
fixed = 0

for model_file in sorted(models_dir.glob('*.py')):
    if model_file.name in ['__init__.py', 'base.py', 'mixins.py']:
        continue
    
    if fix_imports(model_file):
        print(f"✓ Fixed: {model_file.name}")
        fixed += 1

print(f"\nFixed {fixed} files")
