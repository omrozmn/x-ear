#!/usr/bin/env python3
"""
Fix "Integer exceeds 64-bit range" errors in Pydantic schemas
Converts large integers to strings in response models
"""
import re
from pathlib import Path
from typing import List

def find_bigint_fields(file_path: Path) -> List[str]:
    """Find fields that might contain large integers"""
    content = file_path.read_text()
    
    # Look for fields with BigInteger, BIGINT, or large number types
    bigint_patterns = [
        r'(\w+):\s*int\s*=.*#.*big',  # Fields with "big" comment
        r'(\w+):\s*int\s*=.*#.*timestamp',  # Timestamp fields
        r'(\w+):\s*int\s*=.*#.*id',  # ID fields that might be large
    ]
    
    fields = []
    for pattern in bigint_patterns:
        matches = re.findall(pattern, content, re.IGNORECASE)
        fields.extend(matches)
    
    return fields

def add_field_serializer(file_path: Path) -> bool:
    """Add field_serializer to convert large ints to strings"""
    content = file_path.read_text()
    original = content
    
    # Check if file has Pydantic models
    if 'BaseModel' not in content and 'AppBaseModel' not in content:
        return False
    
    # Add import for field_serializer if not present
    if 'field_serializer' not in content and 'from pydantic import' in content:
        content = re.sub(
            r'(from pydantic import [^\n]+)',
            r'\1, field_serializer',
            content
        )
    elif 'field_serializer' not in content:
        # Add new import
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if line.startswith('from pydantic'):
                lines.insert(i + 1, 'from pydantic import field_serializer')
                break
        content = '\n'.join(lines)
    
    # Find all Read/Response models (these are returned to client)
    read_models = re.findall(r'class (\w+(?:Read|Response|Detail))\([^)]+\):', content)
    
    modified = False
    for model_name in read_models:
        # Check if model already has field_serializer
        if '@field_serializer' in content and model_name in content:
            continue
        
        # Find the model class
        model_pattern = rf'(class {model_name}\([^)]+\):.*?)(?=\nclass |\Z)'
        model_match = re.search(model_pattern, content, re.DOTALL)
        
        if model_match:
            model_content = model_match.group(1)
            
            # Check if model has integer fields
            if 'int' in model_content or 'Optional[int]' in model_content:
                # Add field_serializer for all int fields
                serializer = '''
    @field_serializer('*', mode='plain', when_used='json')
    def serialize_ints(self, value):
        """Convert large integers to strings to avoid JSON serialization errors"""
        if isinstance(value, int) and (value > 2**53 or value < -(2**53)):
            return str(value)
        return value
'''
                # Insert before the last line of the class (usually pass or last field)
                lines = model_content.split('\n')
                # Find last non-empty line
                for i in range(len(lines) - 1, -1, -1):
                    if lines[i].strip() and not lines[i].strip().startswith('#'):
                        lines.insert(i + 1, serializer)
                        break
                
                new_model = '\n'.join(lines)
                content = content.replace(model_content, new_model)
                modified = True
    
    if content != original:
        file_path.write_text(content)
        return True
    return False

def main():
    print("🔧 Fixing 'Integer exceeds 64-bit range' errors...")
    print("=" * 60)
    
    schemas_dir = Path('apps/api/schemas')
    
    fixed = 0
    for schema_file in schemas_dir.glob('*.py'):
        if add_field_serializer(schema_file):
            fixed += 1
            print(f"  ✓ {schema_file.name}")
    
    print(f"\n✅ Fixed {fixed} schema files")
    print("\nNote: Large integers (> 2^53) will now be serialized as strings")

if __name__ == "__main__":
    main()
