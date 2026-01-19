-- ============================================================================
-- AI Layer Database Role Creation Script
-- ============================================================================
-- 
-- This script creates a restricted database role for the AI Layer.
-- The AI Layer MUST use this role to enforce database isolation.
--
-- Requirements:
-- - 1.4: AI Layer SHALL NOT have direct database write access to core business tables
-- - 6.2: AI Layer SHALL NEVER perform direct database writes to core tables
-- - 6.7: AI Layer database connection SHALL use a restricted role with write access
--        ONLY to AI_Audit_Storage tables
--
-- Usage:
--   Run this script as a database superuser (e.g., postgres)
--   psql -U postgres -d your_database -f create_ai_db_role.sql
--
-- ============================================================================

-- Create the AI Layer role (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ai_layer_role') THEN
        CREATE ROLE ai_layer_role WITH LOGIN PASSWORD 'CHANGE_ME_IN_PRODUCTION';
        RAISE NOTICE 'Created role: ai_layer_role';
    ELSE
        RAISE NOTICE 'Role ai_layer_role already exists';
    END IF;
END
$$;

-- Revoke all default privileges
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ai_layer_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM ai_layer_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM ai_layer_role;

-- Grant CONNECT to the database
GRANT CONNECT ON DATABASE current_database() TO ai_layer_role;

-- Grant USAGE on public schema
GRANT USAGE ON SCHEMA public TO ai_layer_role;

-- ============================================================================
-- AI Layer Tables - Full Access (SELECT, INSERT, UPDATE, DELETE)
-- ============================================================================

-- AI Requests table
GRANT SELECT, INSERT, UPDATE ON TABLE ai_requests TO ai_layer_role;
GRANT USAGE, SELECT ON SEQUENCE ai_requests_id_seq TO ai_layer_role;

-- AI Actions table
GRANT SELECT, INSERT, UPDATE ON TABLE ai_actions TO ai_layer_role;
GRANT USAGE, SELECT ON SEQUENCE ai_actions_id_seq TO ai_layer_role;

-- AI Audit Logs table (INSERT only - append-only)
GRANT SELECT, INSERT ON TABLE ai_audit_logs TO ai_layer_role;
GRANT USAGE, SELECT ON SEQUENCE ai_audit_logs_id_seq TO ai_layer_role;

-- AI Usage table
GRANT SELECT, INSERT, UPDATE ON TABLE ai_usage TO ai_layer_role;
GRANT USAGE, SELECT ON SEQUENCE ai_usage_id_seq TO ai_layer_role;

-- ============================================================================
-- Core Tables - READ ONLY Access
-- ============================================================================
-- The AI Layer needs to read some core tables for context, but NEVER write.

-- Users table (read-only for user context)
GRANT SELECT ON TABLE users TO ai_layer_role;

-- Tenants table (read-only for tenant context)
GRANT SELECT ON TABLE tenants TO ai_layer_role;

-- Feature flags table (read-only for feature checks)
GRANT SELECT ON TABLE feature_flags TO ai_layer_role;

-- Roles and permissions (read-only for RBAC checks)
GRANT SELECT ON TABLE roles TO ai_layer_role;
GRANT SELECT ON TABLE permissions TO ai_layer_role;
GRANT SELECT ON TABLE user_roles TO ai_layer_role;
GRANT SELECT ON TABLE role_permissions TO ai_layer_role;

-- ============================================================================
-- Explicitly DENY access to sensitive core tables
-- ============================================================================
-- These tables should NEVER be accessible to the AI Layer

REVOKE ALL ON TABLE patients FROM ai_layer_role;
REVOKE ALL ON TABLE sales FROM ai_layer_role;
REVOKE ALL ON TABLE invoices FROM ai_layer_role;
REVOKE ALL ON TABLE devices FROM ai_layer_role;
REVOKE ALL ON TABLE appointments FROM ai_layer_role;
REVOKE ALL ON TABLE medical_records FROM ai_layer_role;
REVOKE ALL ON TABLE payments FROM ai_layer_role;
REVOKE ALL ON TABLE subscriptions FROM ai_layer_role;

-- ============================================================================
-- Verify permissions
-- ============================================================================

-- List all permissions for ai_layer_role
SELECT 
    table_schema,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE grantee = 'ai_layer_role'
ORDER BY table_schema, table_name, privilege_type;

-- ============================================================================
-- Notes for Production Deployment
-- ============================================================================
-- 
-- 1. Change the password from 'CHANGE_ME_IN_PRODUCTION' to a secure password
-- 2. Store the password in a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
-- 3. Configure the AI Layer to use this role via environment variable:
--    AI_DATABASE_URL=postgresql://ai_layer_role:PASSWORD@host:port/database
-- 4. Regularly audit the permissions using the query above
-- 5. Consider using row-level security (RLS) for additional tenant isolation
--
-- ============================================================================
