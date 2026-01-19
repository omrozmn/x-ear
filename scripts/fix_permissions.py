
import sys
import os
import re

# We will read the file as text and perform string replacement
# This preserves comments and formatting exactly.

MAPPING_FILE = 'apps/api/config/permissions_map.py'

# The fixes derived from the audit (Method, Path, Old, New)
# We use the audit report data directly
FIXES = [
    # Critical Security Fixes (None -> Permission)
    ('POST', '/presigned', 'None', 'upload.edit'),
    ('GET', '/files', 'None', 'upload.view'),
    ('DELETE', '/files', 'None', 'upload.delete'),
    
    # Mismatches (Wrong key -> Correct key)
    ('POST', '/auth/send-verification-otp', 'public', 'auth.edit'),
    ('GET', '/users', 'team.view', 'users.view'),
    ('POST', '/users', 'team.create', 'users.edit'),
    ('GET', '/roles', 'team.view', 'role:read'),
    ('POST', '/roles', 'team.permissions', 'role:write'),
    ('PUT', '/roles/<role_id>', 'team.permissions', 'role:write'),
    ('DELETE', '/roles/<role_id>', 'team.permissions', 'role:write'),
    ('POST', '/roles/<role_id>/permissions', 'team.permissions', 'role:write'),
    ('DELETE', '/roles/<role_id>/permissions/<permission_id>', 'team.permissions', 'role:write'),
    ('POST', '/sales', 'sales.edit', 'sales.create'),
    ('GET', '/apps', 'settings.view', 'admin.apps.view'),
    ('POST', '/apps', 'settings.edit', 'admin.apps.edit'),
    ('POST', '/api/EFatura/sendDocument', 'invoices.send', 'integration.birfatura.edit'),
    ('POST', '/api/EFatura/sendBasicInvoice', 'invoices.send', 'integration.birfatura.edit'),
    ('POST', '/api/OutEBelgeV2/SendDocument', 'invoices.send', 'integration.birfatura.edit'),
    ('POST', '/api/OutEBelgeV2/SendBasicInvoiceFromModel', 'invoices.send', 'integration.birfatura.edit'),
    ('POST', '/api/birfatura/sync-invoices', 'invoices.view', 'integration.birfatura.sync'),
    ('GET', '/admin/sms/packages', 'platform.sms_packages.read', 'admin.sms.view'),
    ('POST', '/admin/sms/packages', 'platform.sms_packages.manage', 'admin.sms.edit'),
    ('PUT', '/admin/sms/packages/<pkg_id>', 'platform.sms_packages.manage', 'admin.sms.edit'),
    ('GET', '/admin/sms/headers', 'platform.sms_headers.read', 'admin.sms.view'),
    ('PUT', '/admin/sms/headers/<header_id>/status', 'platform.sms_headers.manage', 'admin.sms.edit'),
    ('GET', '/tenant/users', 'tenant_users.view', 'users.view'),
    ('POST', '/tenant/users', 'tenant_users.edit', 'users.edit'),
    ('DELETE', '/tenant/users/<user_id>', 'tenant_users.delete', 'users.delete'),
    ('PUT', '/tenant/users/<user_id>', 'tenant_users.edit', 'users.edit'),
    ('GET', '/tenant/company', 'tenant_users.view', 'users.view'),
    ('PUT', '/tenant/company', 'tenant_users.edit', 'users.edit'),
    ('POST', '/tenant/company/upload/<asset_type>', 'tenant_users.edit', 'users.edit'),
    ('DELETE', '/tenant/company/upload/<asset_type>', 'tenant_users.delete', 'users.delete'),
    ('GET', '/tenant/assets/<tenant_id>/<filename>', 'None', 'users.view'),
    ('GET', '/api/tenant/company/assets/<asset_type>/url', 'settings.view', 'users.view'),
    ('GET', '/permissions', 'team.permissions', 'role:read'),
    ('GET', '/permissions/role/<role_name>', 'team.permissions', 'role:read'),
    ('PUT', '/permissions/role/<role_name>', 'team.permissions', 'role:write'),
    ('GET', '/paytr/config', 'settings.integrations', 'pos.view'),
    ('PUT', '/paytr/config', 'settings.integrations', 'pos.edit'),
    
    # Specific adjustments
    ('GET', '/transactions', 'finance.view', 'admin.payments.view'),
    ('POST', '/installment-options', 'finance.view', 'pos.view'),
    ('GET', '/patients/<patient_id>/sales', 'sales.view', 'patients.view'),
    ('GET', '/sales/<sale_id>/payments', 'finance.view', 'sales.view'),
    ('POST', '/sales/<sale_id>/payments', 'finance.payments', 'sales.edit'),
    ('GET', '/sales/<sale_id>/payment-plan', 'finance.view', 'sales.view'),
    ('DELETE', '/api/suppliers/<int:supplier_id>', 'suppliers.edit', 'suppliers.delete'),
    ('DELETE', '/api/suppliers/suggested/<int:suggested_id>', 'suppliers.edit', 'suppliers.delete'),
    ('GET', '/api/products/<product_id>/suppliers', 'suppliers.view', 'inventory.view'),
    ('POST', '/api/products/<product_id>/suppliers', 'suppliers.edit', 'inventory.edit'),
    ('DELETE', '/api/product-suppliers/<int:ps_id>', 'suppliers.edit', 'suppliers.delete'),
    ('OPTIONS', '/sales/<sale_id>/invoice', 'None', 'invoices.edit'),
    ('POST', '/categories', 'inventory.manage', 'inventory.edit'),
    ('POST', '/brands', 'inventory.manage', 'inventory.edit')
]

def apply_fixes():
    if not os.path.exists(MAPPING_FILE):
        print(f"Error: {MAPPING_FILE} not found.")
        return

    with open(MAPPING_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content
    replaced_count = 0
    
    for method, path, old, new in FIXES:
        # Construct the target line substring to ensure uniqueness
        # Example: ('GET', '/users'): 'team.view',
        
        # We handle None vs 'string'
        old_repr = f"'{old}'" if old != 'None' else 'None'
        new_repr = f"'{new}'" if new != 'None' else 'None'
        
        target = f"('{method}', '{path}'): {old_repr}"
        replacement = f"('{method}', '{path}'): {new_repr}"
        
        # Safety check: if old was 'public', ensure we don't break logic
        # But 'public' is a string literal so handled above.
        
        if target in new_content:
            new_content = new_content.replace(target, replacement)
            replaced_count += 1
            print(f"✅ Fixed: {method} {path} -> {new}")
        else:
             print(f"⚠️  Target not found (already fixed?): {target}")

    # Write back
    with open(MAPPING_FILE, 'w', encoding='utf-8') as f:
        f.write(new_content)
        
    print(f"\nTotal fixes applied: {replaced_count}/{len(FIXES)}")

if __name__ == "__main__":
    apply_fixes()
