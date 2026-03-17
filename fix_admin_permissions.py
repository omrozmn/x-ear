#!/usr/bin/env python3
"""Fix admin endpoint permissions - replace require_access with get_current_admin_user"""
import re

files_to_fix = [
    "apps/api/routers/email_approval.py",
    "apps/api/routers/unsubscribe_management.py",
    "apps/api/routers/spam_preview.py",
    "apps/api/routers/complaint_management.py",
    "apps/api/routers/deliverability.py",
    "apps/api/routers/admin_tenants.py",
]

for filepath in files_to_fix:
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Replace require_access("admin.*") with get_current_admin_user
        original = content
        content = re.sub(
            r'access:\s*UnifiedAccess\s*=\s*Depends\(require_access\("admin\.[^"]+"\)\)',
            'admin_user=Depends(get_current_admin_user)',
            content
        )
        
        if content != original:
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"✓ Fixed {filepath}")
        else:
            print(f"- No changes needed in {filepath}")
            
    except FileNotFoundError:
        print(f"✗ File not found: {filepath}")
    except Exception as e:
        print(f"✗ Error in {filepath}: {e}")

print("\nDone!")
