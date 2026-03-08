#!/usr/bin/env python3
"""Fix admin routers - remove access.* references"""

files_to_fix = [
    "apps/api/routers/bounce_management.py",
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
        
        # Remove lines with access.user, access.tenant_id, access.is_super_admin
        lines = content.split('\n')
        new_lines = []
        skip_next = False
        
        for i, line in enumerate(lines):
            # Skip lines that reference access.* variables
            if 'access.user' in line or 'access.tenant_id' in line or 'access.is_super_admin' in line:
                continue
            # Skip user = access.user lines
            if 'user = access' in line or 'tenant_id = access' in line:
                continue
            new_lines.append(line)
        
        content = '\n'.join(new_lines)
        
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"✓ Fixed {filepath}")
            
    except FileNotFoundError:
        print(f"✗ File not found: {filepath}")
    except Exception as e:
        print(f"✗ Error in {filepath}: {e}")

print("\nDone!")
