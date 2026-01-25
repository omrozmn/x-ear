import re
import os

MAP_FILE = '/Users/omerozmen/Desktop/x-ear web app/x-ear/apps/api/config/permissions_map.py'

# Systematic mapping rules
# (legacy_domain, legacy_action) -> (modern_domain, modern_action)
RULES = {
    # Parties / Patients
    ('parties', 'view'): ('patient', 'read'),
    ('parties', 'create'): ('patient', 'write'),
    ('parties', 'edit'): ('patient', 'write'),
    ('parties', 'delete'): ('patient', 'delete'),
    ('parties', 'export'): ('patient', 'export'),
    ('parties', 'history'): ('patient', 'history'),
    ('parties', 'notes'): ('patient', 'notes'),
    
    # Sales
    ('sales', 'view'): ('sale', 'read'),
    ('sales', 'create'): ('sale', 'write'),
    ('sales', 'edit'): ('sale', 'write'),
    ('sales', 'delete'): ('sale', 'delete'),
    
    # Invoices
    ('invoices', 'view'): ('invoice', 'read'),
    ('invoices', 'create'): ('invoice', 'write'),
    ('invoices', 'edit'): ('invoice', 'write'),
    ('invoices', 'send'): ('invoice', 'write'),
    ('invoices', 'cancel'): ('invoice', 'delete'),
    ('invoices', 'delete'): ('invoice', 'delete'),
    ('invoices', 'export'): ('invoice', 'export'),
    
    # Finance / Payments
    ('finance', 'view'): ('finance', 'read'),
    ('finance', 'payments'): ('payments', 'write'),
    ('finance', 'cash_register'): ('cash_records', 'write'),
    ('payments', 'view'): ('payments', 'read'),
    ('payments', 'edit'): ('payments', 'write'),
    ('cash_records', 'view'): ('cash_records', 'read'),
    ('cash_records', 'edit'): ('cash_records', 'write'),
    
    # Inventory
    ('inventory', 'view'): ('inventory', 'read'),
    ('inventory', 'manage'): ('inventory', 'write'),
    ('inventory', 'edit'): ('inventory', 'write'),
    
    # Suppliers
    ('suppliers', 'view'): ('supplier', 'read'),
    ('suppliers', 'edit'): ('supplier', 'write'),
    ('suppliers', 'delete'): ('supplier', 'delete'),
    
    # Appointments
    ('appointments', 'view'): ('appointment', 'read'),
    ('appointments', 'create'): ('appointment', 'write'),
    ('appointments', 'edit'): ('appointment', 'write'),
    ('appointments', 'delete'): ('appointment', 'delete'),
    
    # Dashboard
    ('dashboard', 'view'): ('dashboard', 'read'),
    ('dashboard', 'analytics'): ('dashboard', 'read'),
    
    # Branches
    ('branches', 'view'): ('branches', 'read'),
    ('branches', 'edit'): ('branches', 'write'),
    ('branches', 'delete'): ('branches', 'delete'),
    
    # Team / Users
    ('team', 'view'): ('users', 'read'),
    ('team', 'create'): ('users', 'write'),
    ('team', 'edit'): ('users', 'write'),
    ('team', 'delete'): ('users', 'delete'),
    ('users', 'view'): ('users', 'read'),
    ('users', 'edit'): ('users', 'write'),
    ('users', 'delete'): ('users', 'delete'),
    
    # Roles / Permissions
    ('team', 'permissions'): ('role', 'write'),
    ('role', 'read'): ('role', 'read'),
    ('role', 'write'): ('role', 'write'),
    
    # Campaigns / SMS
    ('campaigns', 'view'): ('campaign', 'read'),
    ('campaigns', 'create'): ('campaign', 'write'),
    ('campaigns', 'edit'): ('campaign', 'write'),
    ('campaigns', 'delete'): ('campaign', 'delete'),
    ('campaigns', 'send_sms'): ('sms', 'write'),
    ('sms', 'view'): ('sms', 'read'),
    ('sms', 'edit'): ('sms', 'write'),
    
    # Activity Logs
    ('activity_logs', 'view'): ('activity_logs', 'read'),
    
    # Upload
    ('upload', 'view'): ('upload', 'read'),
    ('upload', 'edit'): ('upload', 'write'),
    ('upload', 'delete'): ('upload', 'delete'),
}

with open(MAP_FILE, 'r') as f:
    content = f.read()

def replace_fn(match):
    full = match.group(0)
    # Check if it's already modernized (contains :)
    if ':' in full:
        return full
    
    domain, action = match.group(1), match.group(2)
    key = (domain, action)
    
    if key in RULES:
        new_domain, new_action = RULES[key]
        return f"'{new_domain}:{new_action}'"
    
    # Fallback to dot -> colon if not in rules but has dot
    return f"'{domain}:{action}'"

# Regex to find 'domain.action' or 'domain.action.sub'
# We'll focus on domain.action patterns
pattern = r"'([a-z_]+)\.([a-z_]+)'"
new_content = re.sub(pattern, replace_fn, content)

with open(MAP_FILE, 'w') as f:
    f.write(new_content)

print("Modernization of permissions_map.py complete.")
