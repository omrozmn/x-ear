#!/bin/bash

# Fix imports from '@/api/generated' to specific module paths

# Inventory imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e "s|from '@/api/generated';$|from '@/api/generated/inventory/inventory';|g" \
  {} \; 2>/dev/null || true

# Settings imports  
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e "s|useListSettings } from '@/api/generated'|useListSettings } from '@/api/generated/settings/settings'|g" \
  {} \; 2>/dev/null || true

# Communications imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e "s|} from '@/api/generated';.*CommunicationTemplates|} from '@/api/generated/communications/communications';|g" \
  {} \; 2>/dev/null || true

# Payment imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e "s|createPaymentRecords } from '@/api/generated'|createPaymentRecords } from '@/api/generated/payments/payments'|g" \
  -e "s|useCreatePaymentPoPaytrInitiate } from '@/api/generated'|useCreatePaymentPoPaytrInitiate } from '@/api/generated/payments/payments'|g" \
  {} \; 2>/dev/null || true

# Sales imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e "s|listSales } from '@/api/generated'|listSales } from '@/api/generated/sales/sales'|g" \
  -e "s|updateSale } from '@/api/generated'|updateSale } from '@/api/generated/sales/sales'|g" \
  -e "s|listSalePromissoryNotes } from '@/api/generated'|listSalePromissoryNotes } from '@/api/generated/sales/sales'|g" \
  {} \; 2>/dev/null || true

# Party/Timeline imports
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e "s|createPartyTimeline, createPartyActivities } from '@/api/generated'|createPartyTimeline, createPartyActivities } from '@/api/generated/parties/parties'|g" \
  -e "s|useCreatePatientReplacements as useCreatePartyReplacements } from '@/api/generated'|useCreatePatientReplacements as useCreatePartyReplacements } from '@/api/generated/replacements/replacements'|g" \
  {} \; 2>/dev/null || true

# Inventory movements
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e "s|useListInventoryMovements, getListInventoryMovementsQueryKey } from '@/api/generated'|useListInventoryMovements, getListInventoryMovementsQueryKey } from '@/api/generated/inventory/inventory'|g" \
  {} \; 2>/dev/null || true

# Inventory stats
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e "s|listInventoryStats } from '@/api/generated'|listInventoryStats } from '@/api/generated/inventory/inventory'|g" \
  -e "s|deleteInventory } from '@/api/generated'|deleteInventory } from '@/api/generated/inventory/inventory'|g" \
  {} \; 2>/dev/null || true

# SMS/Campaigns
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e "s|useListSmHeaders, getListSmHeadersQueryKey } from '@/api/generated'|useListSmHeaders, getListSmHeadersQueryKey } from '@/api/generated/sms/sms'|g" \
  -e "s|useListSmCredit } from '@/api/generated'|useListSmCredit } from '@/api/generated/sms/sms'|g" \
  {} \; 2>/dev/null || true

# Tenants/Admin
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e "s|} from '@/api/generated';.*DebugTenantSwitcher|} from '@/api/generated/admin-tenants/admin-tenants';|g" \
  -e "s|} from '@/api/generated';.*DebugRoleSwitcher|} from '@/api/generated/roles/roles';|g" \
  {} \; 2>/dev/null || true

# Subscriptions
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e "s|} from '@/api/generated';.*Subscription\.tsx|} from '@/api/generated/subscriptions/subscriptions';|g" \
  {} \; 2>/dev/null || true

# Roles/Permissions
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e "s|} from '@/api/generated';.*RolePermissionsTab|} from '@/api/generated/roles/roles';|g" \
  {} \; 2>/dev/null || true

# Reports/Activity
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e "s|} from '@/api/generated';.*ActivityLogs|} from '@/api/generated/activity-logs/activity-logs';|g" \
  {} \; 2>/dev/null || true

# Generic pages
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e "s|} from '@/api/generated';.*PosPage|} from '@/api/generated/pos-commission/pos-commission';|g" \
  -e "s|} from '@/api/generated';.*ReportsPage|} from '@/api/generated/reports/reports';|g" \
  -e "s|} from '@/api/generated';.*ProfilePage|} from '@/api/generated/users/users';|g" \
  -e "s|} from '@/api/generated';.*InventoryDetailPage|} from '@/api/generated/inventory/inventory';|g" \
  -e "s|} from '@/api/generated';.*Campaigns|} from '@/api/generated/campaigns/campaigns';|g" \
  -e "s|} from '@/api/generated';.*SmsTab|} from '@/api/generated/sms/sms';|g" \
  {} \; 2>/dev/null || true

echo "Import fixes applied!"
