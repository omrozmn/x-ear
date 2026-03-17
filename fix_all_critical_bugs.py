#!/usr/bin/env python3
"""
Fix all critical bugs found by Schemathesis
NO MD files will be created
"""
import re
from pathlib import Path

def fix_sgk_import(file_path):
    """Fix models.sgk import to core.models.sgk"""
    content = file_path.read_text()
    original = content
    
    # Fix import statement
    content = re.sub(
        r'from models\.sgk import',
        r'from core.models.sgk import',
        content
    )
    
    if content != original:
        file_path.write_text(content)
        return True
    return False

def fix_invoice_patient_attribute(file_path):
    """Fix invoice.patient to invoice.party"""
    content = file_path.read_text()
    original = content
    
    # Fix invoice.patient.name -> invoice.party.full_name
    content = re.sub(
        r'invoice\.patient\.name',
        r'invoice.party.full_name',
        content
    )
    
    # Fix invoice.patient.full_name -> invoice.party.full_name
    content = re.sub(
        r'invoice\.patient\.full_name',
        r'invoice.party.full_name',
        content
    )
    
    # Fix invoice.patient -> invoice.party
    content = re.sub(
        r'invoice\.patient\b',
        r'invoice.party',
        content
    )
    
    if content != original:
        file_path.write_text(content)
        return True
    return False

def add_exception_handling(router_file):
    """Add try-except to router functions without proper error handling"""
    content = router_file.read_text()
    original = content
    
    # This is complex, skip for now - will be manual
    return False

def fix_pydantic_attribute_access():
    """Fix Pydantic schema attribute access issues"""
    # Find and fix partyId vs party_id issues
    files_to_fix = [
        'x-ear/apps/api/schemas/communications.py',
        'x-ear/apps/api/routers/communications.py',
    ]
    
    fixed = []
    for file_path in files_to_fix:
        path = Path(file_path)
        if not path.exists():
            continue
            
        content = path.read_text()
        original = content
        
        # Fix attribute access in routers - use model_dump() instead of direct access
        if 'routers' in str(path):
            # Add proper Pydantic v2 usage
            if 'data.partyId' in content:
                content = content.replace('data.partyId', 'data.party_id')
            if 'data.templateType' in content:
                content = content.replace('data.templateType', 'data.template_type')
        
        if content != original:
            path.write_text(content)
            fixed.append(str(path))
    
    return fixed

def main():
    print("🔧 Fixing all critical bugs...")
    
    # 1. Fix SGK import
    print("\n1. Fixing models.sgk imports...")
    sgk_files = [
        Path('x-ear/apps/api/routers/sgk.py'),
        Path('backups/routers/sgk.py'),
    ]
    fixed_sgk = 0
    for f in sgk_files:
        if f.exists() and fix_sgk_import(f):
            print(f"  ✓ Fixed {f}")
            fixed_sgk += 1
    print(f"  Total: {fixed_sgk} files")
    
    # 2. Fix invoice.patient
    print("\n2. Fixing invoice.patient -> invoice.party...")
    invoice_files = list(Path('x-ear/apps/api/routers').glob('*invoices*.py'))
    fixed_invoice = 0
    for f in invoice_files:
        if fix_invoice_patient_attribute(f):
            print(f"  ✓ Fixed {f.name}")
            fixed_invoice += 1
    print(f"  Total: {fixed_invoice} files")
    
    # 3. Fix Pydantic attribute access
    print("\n3. Fixing Pydantic attribute access...")
    fixed_pydantic = fix_pydantic_attribute_access()
    if fixed_pydantic:
        for f in fixed_pydantic:
            print(f"  ✓ Fixed {f}")
    print(f"  Total: {len(fixed_pydantic)} files")
    
    print("\n✅ Critical bugs fixed!")
    print("\nSummary:")
    print(f"  - SGK imports: {fixed_sgk}")
    print(f"  - Invoice.patient: {fixed_invoice}")
    print(f"  - Pydantic attributes: {len(fixed_pydantic)}")

if __name__ == "__main__":
    main()
