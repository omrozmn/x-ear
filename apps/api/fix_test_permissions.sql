-- Fix test user permissions

-- Create roles if not exist
INSERT OR IGNORE INTO roles (id, name, is_system) VALUES ('role_admin', 'admin', 1);
INSERT OR IGNORE INTO roles (id, name, is_system) VALUES ('role_user', 'user', 1);
INSERT OR IGNORE INTO roles (id, name, is_system) VALUES ('role_tenant_admin', 'TENANT_ADMIN', 1);

-- Assign ALL permissions to admin role
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_admin', p.id FROM permissions p;

-- Assign ALL permissions to user role (for testing)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_user', p.id FROM permissions p;

-- Assign ALL permissions to TENANT_ADMIN role
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_tenant_admin', p.id FROM permissions p;

-- Verify
SELECT 'Permissions count:' as info, COUNT(*) as count FROM permissions
UNION ALL
SELECT 'Role permissions count:', COUNT(*) FROM role_permissions
UNION ALL
SELECT 'Admin role permissions:', COUNT(*) FROM role_permissions WHERE role_id = 'role_admin'
UNION ALL
SELECT 'User role permissions:', COUNT(*) FROM role_permissions WHERE role_id = 'role_user';
