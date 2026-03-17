#!/usr/bin/env python3
"""Add get_current_admin_user import to files that need it"""

files_to_fix = [
    "apps/api/routers/admin_settings.py",
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
        
        # Check if get_current_admin_user is used but not imported
        if 'get_current_admin_user' in content and 'from core.dependencies import get_current_admin_user' not in content:
            # Add import after other core imports
            if 'from core.database import' in content:
                content = content.replace(
                    'from core.database import',
                    'from core.dependencies import get_current_admin_user\nfrom core.database import'
                )
            elif 'from database import' in content:
                content = content.replace(
                    'from database import',
                    'from core.dependencies import get_current_admin_user\nfrom database import'
                )
            else:
                # Add at the beginning of imports
                lines = content.split('\n')
                for i, line in enumerate(lines):
                    if line.startswith('from ') or line.startswith('import '):
                        lines.insert(i, 'from core.dependencies import get_current_admin_user')
                        break
                content = '\n'.join(lines)
            
            with open(filepath, 'w') as f:
                f.write(content)
            print(f"✓ Added import to {filepath}")
        else:
            print(f"- No changes needed in {filepath}")
            
    except FileNotFoundError:
        print(f"✗ File not found: {filepath}")
    except Exception as e:
        print(f"✗ Error in {filepath}: {e}")

print("\nDone!")
