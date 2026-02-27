#!/usr/bin/env python3
"""
Fix Pydantic validation errors by making fields more flexible
"""
import re
from pathlib import Path

def fix_details_field(file_path: Path) -> bool:
    """Make 'details' field accept both dict and str"""
    content = file_path.read_text()
    original = content
    
    # Pattern 1: details: dict
    content = re.sub(
        r'(\s+)details:\s*dict\b',
        r'\1details: dict | str | None = None',
        content
    )
    
    # Pattern 2: details: Dict[str, Any]
    content = re.sub(
        r'(\s+)details:\s*Dict\[str,\s*Any\]',
        r'\1details: Dict[str, Any] | str | None = None',
        content
    )
    
    # Pattern 3: details: Optional[dict]
    content = re.sub(
        r'(\s+)details:\s*Optional\[dict\]',
        r'\1details: dict | str | None = None',
        content
    )
    
    if content != original:
        file_path.write_text(content)
        return True
    return False

def fix_price_field(file_path: Path) -> bool:
    """Make 'price' field accept str and convert to float"""
    content = file_path.read_text()
    original = content
    
    # Pattern: price: float (without Optional or default)
    content = re.sub(
        r'(\s+)price:\s*float\s*$',
        r'\1price: float | str | None = None',
        content,
        flags=re.MULTILINE
    )
    
    if content != original:
        file_path.write_text(content)
        return True
    return False

def fix_documents_field(file_path: Path) -> bool:
    """Make 'documents' field properly typed as list"""
    content = file_path.read_text()
    original = content
    
    # Pattern: documents without proper type
    if 'documents' in content and 'List[' not in content:
        content = re.sub(
            r'(\s+)documents:\s*(\w+)\s*$',
            r'\1documents: List[\2] | None = None',
            content,
            flags=re.MULTILINE
        )
    
    if content != original:
        file_path.write_text(content)
        return True
    return False

def main():
    print("🔧 Fixing Pydantic validation errors...")
    print("=" * 60)
    
    schemas_dir = Path('apps/api/schemas')
    
    stats = {
        'details': 0,
        'price': 0,
        'documents': 0,
    }
    
    for schema_file in schemas_dir.glob('*.py'):
        if fix_details_field(schema_file):
            stats['details'] += 1
            print(f"  ✓ Fixed 'details' in {schema_file.name}")
        
        if fix_price_field(schema_file):
            stats['price'] += 1
            print(f"  ✓ Fixed 'price' in {schema_file.name}")
        
        if fix_documents_field(schema_file):
            stats['documents'] += 1
            print(f"  ✓ Fixed 'documents' in {schema_file.name}")
    
    print(f"\n✅ Summary:")
    print(f"  - details fields fixed: {stats['details']}")
    print(f"  - price fields fixed: {stats['price']}")
    print(f"  - documents fields fixed: {stats['documents']}")

if __name__ == "__main__":
    main()
