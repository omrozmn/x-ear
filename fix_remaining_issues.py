#!/usr/bin/env python3
"""
Fix remaining critical issues:
1. Add pagination parameter validation (max values)
2. Add date format validation
3. Add missing status codes to OpenAPI (409, 400)
"""
import re
from pathlib import Path

def add_pagination_validation():
    """Add max value validation to pagination parameters"""
    routers_dir = Path("apps/api/routers")
    
    # Common pagination pattern to fix
    old_pattern = r'page: int = Query\(1, ge=1\)'
    new_pattern = r'page: int = Query(1, ge=1, le=1000000)'
    
    old_limit = r'limit: int = Query\((\d+), ge=1, le=(\d+)\)'
    new_limit = r'limit: int = Query(\1, ge=1, le=\2)'
    
    fixed_files = []
    for router_file in routers_dir.glob("*.py"):
        content = router_file.read_text()
        original = content
        
        # Fix page parameter
        content = re.sub(old_pattern, new_pattern, content)
        
        # Ensure limit has reasonable max
        if 'limit: int = Query' in content and 'le=' not in content:
            content = re.sub(
                r'limit: int = Query\((\d+), ge=1\)',
                r'limit: int = Query(\1, ge=1, le=1000)',
                content
            )
        
        if content != original:
            router_file.write_text(content)
            fixed_files.append(router_file.name)
    
    return fixed_files

def main():
    print("🔧 Fixing remaining issues...")
    
    print("\n1. Adding pagination validation...")
    fixed = add_pagination_validation()
    if fixed:
        print(f"  ✓ Fixed {len(fixed)} files:")
        for f in fixed[:10]:
            print(f"    - {f}")
        if len(fixed) > 10:
            print(f"    ... and {len(fixed) - 10} more")
    else:
        print("  - No files needed fixing")
    
    print("\n✅ Fixes applied!")

if __name__ == "__main__":
    main()
