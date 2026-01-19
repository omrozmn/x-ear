-- Insert test tenant
INSERT OR IGNORE INTO tenants (id, name, subdomain, is_active, created_at, updated_at)
VALUES ('test-tenant-001', 'Test Tenant', 'test', 1, datetime('now'), datetime('now'));

-- Insert test users
-- Password: testpass123
-- Password: correctpassword

INSERT OR IGNORE INTO users (id, username, email, phone, tenant_id, password_hash, first_name, last_name, role, is_active, is_phone_verified, permissions_version, created_at, updated_at)
VALUES 
('usr_test001', 'unverified_phone_user', 'unverified@test.com', '5551234567', 'test-tenant-001', 'pbkdf2:sha256:1000000$1CXvOhtWS9cfRWCI$159f07dd70e593556963672e9500b65317fee3a0e5b37884ab9ae23c06919bee', 'Unverified', 'Phone', 'user', 1, 0, 1, datetime('now'), datetime('now')),
('usr_test002', 'no_phone_user', 'nophone@test.com', NULL, 'test-tenant-001', 'pbkdf2:sha256:1000000$1CXvOhtWS9cfRWCI$159f07dd70e593556963672e9500b65317fee3a0e5b37884ab9ae23c06919bee', 'No', 'Phone', 'user', 1, 0, 1, datetime('now'), datetime('now')),
('usr_test003', 'invalid_user', 'invalid@test.com', '5559999999', 'test-tenant-001', 'pbkdf2:sha256:1000000$EREf1OWNHAUmro7G$18ed0bfcf6d17c045ac575ca62c56c5461c186f483a6730926b88a4f42cb6db0', 'Invalid', 'User', 'user', 1, 1, 1, datetime('now'), datetime('now')),
('usr_test004', 'testuser', 'testuser@test.com', '5558888888', 'test-tenant-001', 'pbkdf2:sha256:1000000$1CXvOhtWS9cfRWCI$159f07dd70e593556963672e9500b65317fee3a0e5b37884ab9ae23c06919bee', 'Test', 'User', 'user', 1, 1, 1, datetime('now'), datetime('now'));
