#!/usr/bin/env python3
"""
Migrate Flask-SQLAlchemy models to SQLAlchemy 2.0
Converts db.Model, db.Column, etc. to proper SQLAlchemy 2.0 syntax
"""
import re
import sys
from pathlib import Path

def migrate_model_file(file_path: Path) -> tuple[str, bool]:
    """Migrate a single model file. Returns (new_content, was_modified)"""
    content = file_path.read_text()
    original = content
    
    # Skip if already migrated (has Mapped or mapped_column)
    if 'Mapped[' in content or 'mapped_column' in content:
        return content, False
    
    # Skip if doesn't use Flask-SQLAlchemy
    if 'db.Model' not in content and 'db.Column' not in content:
        return content, False
    
    print(f"Migrating: {file_path.name}")
    
    # 1. Fix imports
    # Remove Flask-SQLAlchemy imports
    content = re.sub(r'from models\.base import db.*\n', '', content)
    
    # Add SQLAlchemy 2.0 imports if not present
    if 'from core.models.base import Base' not in content:
        # Find first import line
        import_match = re.search(r'^(from |import )', content, re.MULTILINE)
        if import_match:
            insert_pos = import_match.start()
            content = content[:insert_pos] + 'from core.models.base import Base\n' + content[insert_pos:]
    
    # 2. Replace db.Model with Base
    content = re.sub(r'\bdb\.Model\b', 'Base', content)
    
    # 3. Replace db.Table with Table (and add import)
    if 'db.Table' in content:
        content = re.sub(r'\bdb\.Table\b', 'Table', content)
        if 'from sqlalchemy import' in content:
            content = re.sub(
                r'from sqlalchemy import ([^\n]+)',
                lambda m: f'from sqlalchemy import {m.group(1)}, Table' if 'Table' not in m.group(1) else m.group(0),
                content
            )
        else:
            content = 'from sqlalchemy import Table\n' + content
    
    # 4. Replace db.Column with Column (simple cases)
    content = re.sub(r'\bdb\.Column\b', 'Column', content)
    
    # 5. Replace db.String, db.Integer, etc.
    type_mappings = {
        'db.String': 'String',
        'db.Integer': 'Integer',
        'db.Boolean': 'Boolean',
        'db.DateTime': 'DateTime',
        'db.Text': 'Text',
        'db.Numeric': 'Numeric',
        'db.Float': 'Float',
        'db.Date': 'Date',
        'db.Time': 'Time',
        'db.JSON': 'JSON',
        'db.ForeignKey': 'ForeignKey',
        'db.Index': 'Index',
        'db.relationship': 'relationship',
        'db.backref': 'backref',
        'db.Enum': 'Enum',
    }
    
    for old, new in type_mappings.items():
        content = re.sub(rf'\b{re.escape(old)}\b', new, content)
    
    # 6. Add SQLAlchemy imports if needed
    needed_types = set()
    for new_type in type_mappings.values():
        if new_type in content and new_type not in ['Column', 'relationship', 'backref']:
            needed_types.add(new_type)
    
    # Add relationship and backref from sqlalchemy.orm
    if 'relationship' in content or 'backref' in content:
        if 'from sqlalchemy.orm import' not in content:
            content = 'from sqlalchemy.orm import relationship, backref\n' + content
        else:
            # Add to existing import
            if 'relationship' not in content.split('from sqlalchemy.orm import')[1].split('\n')[0]:
                content = re.sub(
                    r'from sqlalchemy\.orm import ([^\n]+)',
                    r'from sqlalchemy.orm import \1, relationship, backref',
                    content,
                    count=1
                )
    
    if needed_types:
        if 'from sqlalchemy import' in content:
            # Add to existing import
            existing_imports = re.search(r'from sqlalchemy import ([^\n]+)', content)
            if existing_imports:
                existing = set(existing_imports.group(1).split(', '))
                new_imports = sorted(needed_types - existing)
                if new_imports:
                    content = re.sub(
                        r'from sqlalchemy import ([^\n]+)',
                        lambda m: f'from sqlalchemy import {m.group(1)}, {", ".join(new_imports)}',
                        content,
                        count=1
                    )
        else:
            # Add new import
            import_line = f'from sqlalchemy import {", ".join(sorted(needed_types))}\n'
            import_match = re.search(r'^(from |import )', content, re.MULTILINE)
            if import_match:
                insert_pos = import_match.start()
                content = content[:insert_pos] + import_line + content[insert_pos:]
    
    return content, content != original

def main():
    models_dir = Path('core/models')
    
    if not models_dir.exists():
        print(f"Error: {models_dir} not found")
        sys.exit(1)
    
    modified_count = 0
    skipped_count = 0
    
    for model_file in sorted(models_dir.glob('*.py')):
        if model_file.name in ['__init__.py', 'base.py', 'mixins.py']:
            continue
        
        new_content, was_modified = migrate_model_file(model_file)
        
        if was_modified:
            model_file.write_text(new_content)
            modified_count += 1
            print(f"  ✓ Modified: {model_file.name}")
        else:
            skipped_count += 1
            print(f"  ⏭ Skipped: {model_file.name}")
    
    print(f"\n{'='*60}")
    print("Migration complete!")
    print(f"  Modified: {modified_count} files")
    print(f"  Skipped:  {skipped_count} files")
    print(f"{'='*60}")

if __name__ == '__main__':
    main()
