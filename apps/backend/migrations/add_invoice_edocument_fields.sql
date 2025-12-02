-- Add e-document fields to invoices table for Birfatura/GİB integration
-- Run this on SQLite database for development

-- Add new columns
ALTER TABLE invoices ADD COLUMN edocument_status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE invoices ADD COLUMN edocument_type VARCHAR(20);
ALTER TABLE invoices ADD COLUMN ettn VARCHAR(100);
ALTER TABLE invoices ADD COLUMN profile_id VARCHAR(50);
ALTER TABLE invoices ADD COLUMN invoice_type_code VARCHAR(20);
ALTER TABLE invoices ADD COLUMN qr_code_data TEXT;
ALTER TABLE invoices ADD COLUMN birfatura_response TEXT;
ALTER TABLE invoices ADD COLUMN gib_pdf_data TEXT;
ALTER TABLE invoices ADD COLUMN gib_pdf_link VARCHAR(500);
ALTER TABLE invoices ADD COLUMN gib_xml_data TEXT;
ALTER TABLE invoices ADD COLUMN birfatura_sent_at DATETIME;
ALTER TABLE invoices ADD COLUMN birfatura_approved_at DATETIME;

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS ix_invoices_ettn ON invoices(ettn);
CREATE INDEX IF NOT EXISTS ix_invoices_edocument_status ON invoices(edocument_status);
