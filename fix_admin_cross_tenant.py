#!/usr/bin/env python3
"""Fix admin routers - remove tenant_id filtering (cross-tenant by design)"""
import re

files_to_fix = [
    "apps/api/routers/bounce_management.py",
    "apps/api/routers/email_approval.py",
    "apps/api/routers/unsubscribe_management.py",
    "apps/api/routers/spam_preview.py",
    "apps/api/routers/complaint_management.py",
    "apps/api/routers/deliverability.py",
]

for filepath in files_to_fix:
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Remove .filter(Model.tenant_id == tenant_id) patterns
        content = re.sub(r'\.filter\([A-Za-z]+\.tenant_id == tenant_id\)', '', content)
        
        # Remove and_(..., Model.tenant_id == tenant_id) patterns
        content = re.sub(r',\s*[A-Za-z]+\.tenant_id == tenant_id', '', content)
        
        # Remove tenant_id parameter from service calls
        content = re.sub(r',\s*tenant_id=tenant_id', '', content)
        content = re.sub(r'tenant_id=tenant_id,\s*', '', content)
        content = re.sub(r'\(tenant_id\)', '()', content)
        
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"✓ Fixed {filepath}")
            
    except FileNotFoundError:
        print(f"✗ File not found: {filepath}")
    except Exception as e:
        print(f"✗ Error in {filepath}: {e}")

print("\nDone!")
