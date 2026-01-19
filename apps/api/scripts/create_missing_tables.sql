-- Create missing tables for E2E tests

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    subdomain VARCHAR(50),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    tenant_id VARCHAR(36) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user',
    is_active BOOLEAN DEFAULT 1,
    is_phone_verified BOOLEAN DEFAULT 0,
    permissions_version INTEGER DEFAULT 1,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Parties table (renamed from patients)
CREATE TABLE IF NOT EXISTS parties (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(120),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Party Roles table (N:N relationship)
CREATE TABLE IF NOT EXISTS party_roles (
    id VARCHAR(50) PRIMARY KEY,
    party_id VARCHAR(50) NOT NULL,
    role_code VARCHAR(20) NOT NULL,
    tenant_id VARCHAR(36) NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (party_id) REFERENCES parties(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(party_id, role_code)
);

-- Hearing Profiles table (product-specific data)
CREATE TABLE IF NOT EXISTS hearing_profiles (
    id VARCHAR(50) PRIMARY KEY,
    party_id VARCHAR(50) NOT NULL UNIQUE,
    tenant_id VARCHAR(36) NOT NULL,
    sgk_info_json TEXT,
    audiogram_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (party_id) REFERENCES parties(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS ix_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS ix_users_username ON users(username);
CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);
CREATE INDEX IF NOT EXISTS ix_parties_tenant_id ON parties(tenant_id);
CREATE INDEX IF NOT EXISTS ix_party_roles_party_id ON party_roles(party_id);
CREATE INDEX IF NOT EXISTS ix_party_roles_tenant_id ON party_roles(tenant_id);
CREATE INDEX IF NOT EXISTS ix_hearing_profiles_party_id ON hearing_profiles(party_id);
CREATE INDEX IF NOT EXISTS ix_hearing_profiles_tenant_id ON hearing_profiles(tenant_id);
