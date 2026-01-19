-- Seed basic permissions for tests
INSERT OR IGNORE INTO roles (id, name, is_system) VALUES ('role_tenant_admin', 'TENANT_ADMIN', 1);

INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_dashboard_view', 'dashboard.view', 'View Dashboard');
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_appointments_view', 'appointments.view', 'View Appointments');
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_auth_edit', 'auth.edit', 'Edit Auth');
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_users_view', 'users.view', 'View Users');
INSERT OR IGNORE INTO permissions (id, name, description) VALUES ('perm_users_edit', 'users.edit', 'Edit Users');

-- Assign permissions to TENANT_ADMIN
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) 
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name='TENANT_ADMIN' AND p.name='dashboard.view';

INSERT OR IGNORE INTO role_permissions (role_id, permission_id) 
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name='TENANT_ADMIN' AND p.name='appointments.view';

INSERT OR IGNORE INTO role_permissions (role_id, permission_id) 
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name='TENANT_ADMIN' AND p.name='auth.edit';

INSERT OR IGNORE INTO role_permissions (role_id, permission_id) 
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name='TENANT_ADMIN' AND p.name='users.view';

INSERT OR IGNORE INTO role_permissions (role_id, permission_id) 
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name='TENANT_ADMIN' AND p.name='users.edit';
