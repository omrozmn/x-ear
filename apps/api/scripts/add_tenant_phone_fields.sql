-- Add contact fields to tenants table
-- Run this with: psql -h localhost -U postgres -d xear_crm -f add_tenant_phone_fields.sql

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS tax_office VARCHAR(100);

-- Verify columns were added
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'tenants' 
AND column_name IN ('phone', 'email', 'address', 'city', 'tax_number', 'tax_office')
ORDER BY column_name;
