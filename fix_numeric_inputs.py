#!/usr/bin/env python3
"""
Script to fix all numeric input placeholders in TSX files.
Ensures that when user clicks on a numeric input with value 0, it clears to empty string.
"""

import re
from pathlib import Path

def fix_numeric_input(content: str) -> tuple[str, int]:
    """Fix numeric inputs to clear 0 values on focus."""
    changes = 0
    
    # Pattern 1: value={someNumber} where someNumber could be 0
    # Replace with: value={someNumber === 0 ? '' : someNumber}
    pattern1 = r'value=\{(\w+)\}\s*\n\s*onChange=\{.*?\}\s*\n\s*(.*?)type="number"'
    
    def replace1(match):
        nonlocal changes
        var_name = match.group(1)
        rest = match.group(2)
        
        # Skip if already has the fix
        if f'{var_name} === 0' in content or f'{var_name} == 0' in content:
            return match.group(0)
        
        # Skip if it's a string variable (like quantity, customPrice, etc.)
        if "'" in var_name or '"' in var_name:
            return match.group(0)
            
        changes += 1
        return f'value={{{var_name} === 0 ? \'\' : {var_name}}}\n                  onChange={{...}}\n                  {rest}type="number"'
    
    # Pattern 2: Find all type="number" inputs and check their value props
    lines = content.split('\n')
    new_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Check if this line or nearby lines have type="number"
        if 'type="number"' in line or (i < len(lines) - 5 and any('type="number"' in lines[j] for j in range(i, min(i+5, len(lines))))):
            # Look for value prop in nearby lines
            for j in range(max(0, i-5), min(i+5, len(lines))):
                if 'value={' in lines[j] and '===' not in lines[j] and '? \'\' :' not in lines[j]:
                    # Extract variable name
                    value_match = re.search(r'value=\{([^}]+)\}', lines[j])
                    if value_match:
                        var_expr = value_match.group(1)
                        
                        # Skip if already fixed or if it's a complex expression
                        if '===' in var_expr or '||' in var_expr or '?' in var_expr:
                            break
                        
                        # Check if it's a simple variable or number
                        if re.match(r'^[\w.]+$', var_expr):
                            # Fix it
                            old_value = f'value={{{var_expr}}}'
                            new_value = f'value={{{var_expr} === 0 ? \'\' : {var_expr}}}'
                            lines[j] = lines[j].replace(old_value, new_value)
                            changes += 1
                    break
        
        new_lines.append(lines[i])
        i += 1
    
    return '\n'.join(new_lines), changes

def process_file(file_path: Path) -> bool:
    """Process a single TSX file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Skip if no numeric inputs
        if 'type="number"' not in content:
            return False
        
        new_content, changes = fix_numeric_input(content)
        
        if changes > 0:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"✅ Fixed {changes} inputs in {file_path}")
            return True
        
        return False
    except Exception as e:
        print(f"❌ Error processing {file_path}: {e}")
        return False

def main():
    """Main function to process all TSX files."""
    base_dir = Path('apps/web/src')
    
    if not base_dir.exists():
        print(f"❌ Directory {base_dir} not found")
        return
    
    tsx_files = list(base_dir.rglob('*.tsx'))
    print(f"Found {len(tsx_files)} TSX files")
    
    fixed_count = 0
    for file_path in tsx_files:
        if process_file(file_path):
            fixed_count += 1
    
    print(f"\n✅ Fixed {fixed_count} files")

if __name__ == '__main__':
    main()
