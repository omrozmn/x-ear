#!/usr/bin/env python3
"""
Remove broken safe_parse_date helper functions that were inserted incorrectly
"""
import re
from pathlib import Path

def remove_broken_helpers(file_path: Path) -> bool:
    """Remove incorrectly inserted safe_parse_date functions"""
    content = file_path.read_text()
    original = content
    
    # Pattern to match the broken helper function
    pattern = r'\n+def safe_parse_date\(date_str: Optional\[str\]\) -> Optional\[str\]:\s*"""Safely parse date string[^}]+?return date_str\s+except[^:]+:\s+return None\s*\n'
    
    content = re.sub(pattern, '\n', content, flags=re.MULTILINE | re.DOTALL)
    
    # Also remove simpler version
    pattern2 = r'\ndef safe_parse_date\([^)]+\)[^:]*:\s*"""[^"]+"""\s*if not[^}]+?return None\s*'
    content = re.sub(pattern2, '', content, flags=re.MULTILINE | re.DOTALL)
    
    if content != original:
        file_path.write_text(content)
        return True
    return False

def main():
    print("🔧 Removing broken helper functions...")
    
    routers_dir = Path('apps/api/routers')
    
    fixed = 0
    for file_path in routers_dir.glob('*.py'):
        if remove_broken_helpers(file_path):
            fixed += 1
            print(f"  ✓ {file_path.name}")
    
    print(f"\n✅ Cleaned {fixed} files")

if __name__ == "__main__":
    main()
