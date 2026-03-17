#!/usr/bin/env python3
"""Fix admin_roles.py - replace require_access() with get_current_admin_user"""
import re

filepath = "apps/api/routers/admin_roles.py"

try:
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Replace access: UnifiedAccess = Depends(require_access()) with admin_user=Depends(get_current_admin_user)
    content = re.sub(
        r'access: UnifiedAccess = Depends\(require_access\(\)\)',
        'admin_user=Depends(get_current_admin_user)',
        content
    )
    
    # Remove access.is_super_admin and access.user checks
    content = re.sub(
        r'if not access\.is_super_admin and \(not access\.user or access\.user\.role not in \[\'admin\', \'super_admin\'\]\):\s*raise HTTPException\(status_code=403, detail="Admin access required"\)\s*',
        '',
        content,
        flags=re.MULTILINE
    )
    
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"✓ Fixed {filepath}")
        
except FileNotFoundError:
    print(f"✗ File not found: {filepath}")
except Exception as e:
    print(f"✗ Error in {filepath}: {e}")

print("\nDone!")
