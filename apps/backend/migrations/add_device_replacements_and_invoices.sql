-- Device Replacements Table
CREATE TABLE IF NOT EXISTS device_replacements (
    id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    old_device_id VARCHAR(50) NOT NULL,
    new_inventory_id VARCHAR(50) NOT NULL,
    old_device_info TEXT,
    new_device_info TEXT,
    status VARCHAR(50) DEFAULT 'pending_invoice',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (old_device_id) REFERENCES devices(id)
);

-- Return Invoices Table
CREATE TABLE IF NOT EXISTS return_invoices (
    id VARCHAR(50) PRIMARY KEY,
    replacement_id VARCHAR(50) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    supplier_name VARCHAR(255),
    supplier_invoice_id VARCHAR(50),
    supplier_invoice_number VARCHAR(100),
    supplier_invoice_date DATE,
    invoice_note TEXT,
    gib_sent BOOLEAN DEFAULT 0,
    gib_sent_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (replacement_id) REFERENCES device_replacements(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_device_replacements_patient ON device_replacements(patient_id);
CREATE INDEX IF NOT EXISTS idx_device_replacements_status ON device_replacements(status);
CREATE INDEX IF NOT EXISTS idx_return_invoices_replacement ON return_invoices(replacement_id);
CREATE INDEX IF NOT EXISTS idx_return_invoices_gib_sent ON return_invoices(gib_sent);
