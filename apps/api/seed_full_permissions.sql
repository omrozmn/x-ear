-- Permissions for Inventory, Sales, Parties, etc.

-- Inventory
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_inventory_view', 'inventory.view', 'View Inventory');
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_inventory_create', 'inventory.create', 'Create Inventory');
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_inventory_edit', 'inventory.edit', 'Edit Inventory');
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_inventory_delete', 'inventory.delete', 'Delete Inventory');
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_inventory_manage', 'inventory.manage', 'Manage Inventory');

-- Sales
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_sales_view', 'sales.view', 'View Sales');
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_sales_create', 'sales.create', 'Create Sales');
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_sales_edit', 'sales.edit', 'Edit Sales');
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_sales_delete', 'sales.delete', 'Delete Sales');

-- Suppliers
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_suppliers_view', 'suppliers.view', 'View Suppliers');
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_suppliers_create', 'suppliers.create', 'Create Suppliers');
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_suppliers_edit', 'suppliers.edit', 'Edit Suppliers');
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_suppliers_delete', 'suppliers.delete', 'Delete Suppliers');

-- Parties
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_parties_view', 'parties.view', 'View Parties');
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_parties_create', 'parties.create', 'Create Parties');
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_parties_edit', 'parties.edit', 'Edit Parties');
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_parties_delete', 'parties.delete', 'Delete Parties');

-- Invoices
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_invoices_view', 'invoices.view', 'View Invoices');
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_invoices_create', 'invoices.create', 'Create Invoices');

-- Purchases
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_purchases_view', 'purchases.view', 'View Purchases');
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_purchases_create', 'purchases.create', 'Create Purchases');

-- Reports
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_reports_view', 'reports.view', 'View Reports');

-- Settings
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_settings_view', 'settings.view', 'View Settings');

-- Tenants
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_tenants_view', 'tenants.view', 'View Tenant Settings');

-- Assign to TENANT_ADMIN
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) 
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name='TENANT_ADMIN' AND p.name IN (
    'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete', 'inventory.manage',
    'sales.view', 'sales.create', 'sales.edit', 'sales.delete',
    'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.delete',
    'parties.view', 'parties.create', 'parties.edit', 'parties.delete',
    'invoices.view', 'invoices.create',
    'purchases.view', 'purchases.create',
    'reports.view',
    'settings.view',
    'tenants.view'
);
