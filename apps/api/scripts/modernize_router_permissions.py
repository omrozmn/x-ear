import os
import re

ROUTERS_DIR = '/Users/omerozmen/Desktop/x-ear web app/x-ear/apps/api/routers/'

# Systematic mapping rules (Simplified subset from permissions_map.py logic)
RULES = {
    'parties.view': 'patient:read',
    'parties.create': 'patient:write',
    'parties.edit': 'patient:write',
    'parties.delete': 'patient:delete',
    'parties.export': 'patient:export',
    'parties.history': 'patient:history',
    'parties.notes': 'patient:notes',
    
    'sales.view': 'sale:read',
    'sales.create': 'sale:write',
    'sales.edit': 'sale:write',
    'sales.delete': 'sale:delete',
    
    'invoices.view': 'invoice:read',
    'invoices.create': 'invoice:write',
    'invoices.edit': 'invoice:write',
    'invoices.send': 'invoice:write',
    'invoices.cancel': 'invoice:delete',
    
    'finance.view': 'finance:read',
    'finance.payments': 'payments:write',
    'finance.cash_register': 'cash_records:write',
    
    'inventory.view': 'inventory:read',
    'inventory.manage': 'inventory:write',
    
    'branches.view': 'branches:read',
    'branches.edit': 'branches:write',
    'branches.delete': 'branches:delete',
}

def modernize_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    
    # Replace require_access("legacy") patterns
    def replace_fn(match):
        legacy = match.group(1)
        return f'require_access("{RULES.get(legacy, legacy)}")'
    
    # Support both single and double quotes
    content = re.sub(r'require_access\("([a-z_.]+)"\)', replace_fn, content)
    content = re.sub(r"require_access\('([a-z_.]+)'\)", lambda m: f"require_access('{RULES.get(m.group(1), m.group(1))}')", content)
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False

count = 0
for filename in os.listdir(ROUTERS_DIR):
    if filename.endswith('.py'):
        if modernize_file(os.path.join(ROUTERS_DIR, filename)):
            print(f"Modernized: {filename}")
            count += 1

print(f"Modernized {count} router files.")
