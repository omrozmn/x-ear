#!/usr/bin/env python3
"""
Fix imports from '@/api/generated' to specific module paths.
This script analyzes the imports and maps them to the correct generated module.
"""

import re
import os
from pathlib import Path

# Mapping of function/hook names to their module paths
IMPORT_MAP = {
    # Inventory
    'listInventory': 'inventory/inventory',
    'getInventory': 'inventory/inventory',
    'updateInventory': 'inventory/inventory',
    'deleteInventory': 'inventory/inventory',
    'listInventoryStats': 'inventory/inventory',
    'useListInventory': 'inventory/inventory',
    'useListInventoryMovements': 'inventory/inventory',
    'getListInventoryMovementsQueryKey': 'inventory/inventory',
    
    # Sales
    'listSales': 'sales/sales',
    'updateSale': 'sales/sales',
    'listSalePromissoryNotes': 'sales/sales',
    
    # Settings
    'useListSettings': 'settings/settings',
    
    # Communications
    'createCommunicationMessageSendSms': 'communications/communications',
    'createCommunicationMessageSendEmail': 'communications/communications',
    'listCommunicationTemplates': 'communications/communications',
    'useListCommunicationTemplates': 'communications/communications',
    'useCreateCommunicationTemplates': 'communications/communications',
    'useUpdateCommunicationTemplates': 'communications/communications',
    'useDeleteCommunicationTemplates': 'communications/communications',
    
    # Payments
    'createPaymentRecords': 'payments/payments',
    'useCreatePaymentPoPaytrInitiate': 'payments/payments',
    
    # Parties/Timeline
    'createPartyTimeline': 'parties/parties',
    'createPartyActivities': 'parties/parties',
    
    # Replacements
    'useCreatePatientReplacements': 'replacements/replacements',
    'useCreatePartyReplacements': 'replacements/replacements',
    
    # SMS
    'useListSmHeaders': 'sms/sms',
    'getListSmHeadersQueryKey': 'sms/sms',
    'useListSmCredit': 'sms/sms',
    'useCreateSmSend': 'sms/sms',
    'useCreateSmBulkSend': 'sms/sms',
    
    # Campaigns
    'useListCampaigns': 'campaigns/campaigns',
    'useCreateCampaigns': 'campaigns/campaigns',
    
    # Tenants
    'useListAdminTenants': 'admin-tenants/admin-tenants',
    'useUpdateAdminTenants': 'admin-tenants/admin-tenants',
    
    # Roles
    'useListRoles': 'roles/roles',
    'useGetRoles': 'roles/roles',
    'useUpdateRoles': 'roles/roles',
    
    # Activity Logs
    'useListActivityLogs': 'activity-logs/activity-logs',
    
    # POS
    'useListPosCommission': 'pos-commission/pos-commission',
    
    # Reports
    'useListReports': 'reports/reports',
    'useListReportOverview': 'reports/reports',
    
    # Users
    'useGetUsers': 'users/users',
    'useUpdateUsers': 'users/users',
    'useListUserMe': 'users/users',
    
    # Subscriptions
    'useListSubscriptions': 'subscriptions/subscriptions',
    'useGetSubscriptions': 'subscriptions/subscriptions',
    'useListSmPackages': 'sms/sms',
    
    # Permissions
    'useGetPermissionRole': 'permissions/permissions',
    
    # Branches
    'useListBranches': 'branches/branches',
    
    # Admin/Debug
    'useListAdminDebugAvailableRoles': 'admin/admin',
}

def fix_file(filepath):
    """Fix imports in a single file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Find all imports from '@/api/generated' (not from subdirectories)
    pattern = r"import\s+{([^}]+)}\s+from\s+'@/api/generated';"
    
    def replace_import(match):
        imports = match.group(1).strip()
        # Extract first import name to determine module
        first_import = imports.split(',')[0].strip().split(' as ')[0].strip()
        
        if first_import in IMPORT_MAP:
            module_path = IMPORT_MAP[first_import]
            return f"import {{{imports}}} from '@/api/generated/{module_path}';"
        else:
            print(f"  ⚠️  Unknown import '{first_import}' in {filepath}")
            return match.group(0)  # Keep original
    
    content = re.sub(pattern, replace_import, content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    src_dir = Path('src')
    fixed_count = 0
    
    for filepath in src_dir.rglob('*.ts*'):
        if 'node_modules' in str(filepath):
            continue
        if fix_file(filepath):
            print(f"✅ Fixed: {filepath}")
            fixed_count += 1
    
    print(f"\n🎉 Fixed {fixed_count} files!")

if __name__ == '__main__':
    main()
