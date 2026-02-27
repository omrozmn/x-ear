#!/usr/bin/env python3
"""
Fix all missing imports in model files after SQLAlchemy 2.0 migration
"""
import os
import re
from pathlib import Path

def fix_file_imports(filepath):
    """Fix missing imports in a single file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    changed = False
    
    # Check if file uses BaseModel but doesn't import it
    if 'BaseModel' in content and 'from .base import' in content:
        # Check if BaseModel is already in the import
        if not re.search(r'from \.base import.*BaseModel', content):
            # Add BaseModel to existing import
            content = re.sub(
                r'(from \.base import [^)]+)',
                lambda m: m.group(1) + ', BaseModel' if 'BaseModel' not in m.group(1) else m.group(1),
                content
            )
            changed = True
    
    # Check if file uses TenantScopedMixin but doesn't import it
    if 'TenantScopedMixin' in content:
        if 'from .mixins import' not in content and 'from models.mixins import' not in content:
            # Add import after base imports
            if 'from .base import' in content:
                content = re.sub(
                    r'(from \.base import[^\n]+\n)',
                    r'\1from .mixins import TenantScopedMixin\n',
                    content
                )
                changed = True
            elif 'from models.base import' in content:
                content = re.sub(
                    r'(from models\.base import[^\n]+\n)',
                    r'\1from models.mixins import TenantScopedMixin\n',
                    content
                )
                changed = True
    
    # Check if file uses JSONMixin but doesn't import it
    if 'JSONMixin' in content:
        if 'from .base import' in content and 'JSONMixin' not in content.split('from .base import')[1].split('\n')[0]:
            content = re.sub(
                r'(from \.base import [^)]+)',
                lambda m: m.group(1) + ', JSONMixin' if 'JSONMixin' not in m.group(1) else m.group(1),
                content
            )
            changed = True
    
    if changed and content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    models_dir = Path('core/models')
    fixed_count = 0
    
    for filepath in models_dir.glob('*.py'):
        if filepath.name == '__init__.py':
            continue
        
        try:
            if fix_file_imports(filepath):
                print(f"✓ Fixed imports in {filepath.name}")
                fixed_count += 1
        except Exception as e:
            print(f"✗ Error fixing {filepath.name}: {e}")
    
    print(f"\n✓ Fixed {fixed_count} files")

if __name__ == '__main__':
    main()
