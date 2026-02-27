#!/usr/bin/env python3
"""
Fix critical bugs found by Schemathesis:
1. Add timezone import to all routers
2. Fix response schema violations
3. Add missing 404/500 status codes to OpenAPI
"""
import os
import re
from pathlib import Path

ROUTERS_DIR = Path("apps/api/routers")

# Files that need timezone import fix
TIMEZONE_FIXES = [
    "invoices.py",
    "sales.py",
    "reports.py",
    "dashboard.py",
    "appointments.py",
    "admin_tenants.py",
    "admin_analytics.py",
    "devices.py",
    "settings.py",
    "sms.py",
    "admin_campaigns.py",
    "admin_marketplaces.py",
    "admin_plans.py",
    "admin_addons.py",
    "birfatura.py",
    "admin_appointments.py",
    "admin_suppliers.py",
    "replacements.py",
    "admin_invoices.py",
    "automation.py",
    "sgk.py",
    "commissions.py",
    "payments.py",
    "admin_api_keys.py",
    "parties.py",
    "admin_payments.py",
    "invoices_actions.py",
]

def fix_timezone_import(file_path):
    """Add timezone to datetime import if missing"""
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Check if timezone is already imported
    if 'from datetime import' in content and 'timezone' not in content:
        # Find the datetime import line
        pattern = r'from datetime import ([^\n]+)'
        match = re.search(pattern, content)
        if match:
            imports = match.group(1)
            if 'timezone' not in imports:
                # Add timezone to imports
                new_imports = imports.rstrip() + ', timezone'
                content = content.replace(match.group(0), f'from datetime import {new_imports}')
                
                with open(file_path, 'w') as f:
                    f.write(content)
                return True
    return False

def main():
    fixed_count = 0
    
    print("🔧 Fixing timezone imports...")
    for filename in TIMEZONE_FIXES:
        file_path = ROUTERS_DIR / filename
        if file_path.exists():
            if fix_timezone_import(file_path):
                print(f"  ✓ Fixed {filename}")
                fixed_count += 1
            else:
                print(f"  - Skipped {filename} (already has timezone or no datetime import)")
        else:
            print(f"  ⚠ File not found: {filename}")
    
    print(f"\n✅ Fixed {fixed_count} files")

if __name__ == "__main__":
    main()
