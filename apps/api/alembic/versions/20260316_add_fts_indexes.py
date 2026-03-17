"""add full-text search and trigram indexes for AI entity resolution

Revision ID: fts_001
Revises: e6c4aac1d6b1
Create Date: 2026-03-16
"""
from alembic import op

revision = 'fts_001'
down_revision = 'e6c4aac1d6b1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable pg_trgm extension for fuzzy/typo-tolerant search
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")

    # --- PARTIES: Full-text search vector column + GIN index ---
    op.execute("""
        ALTER TABLE parties
        ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
            to_tsvector('simple',
                coalesce(first_name, '') || ' ' ||
                coalesce(last_name, '') || ' ' ||
                coalesce(phone, '') || ' ' ||
                coalesce(email, '') || ' ' ||
                coalesce(tc_number, '') || ' ' ||
                coalesce(address_city, '') || ' ' ||
                coalesce(address_district, '')
            )
        ) STORED;
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_parties_search_vector ON parties USING GIN(search_vector);")

    # Trigram indexes for fuzzy matching on key fields
    op.execute("CREATE INDEX IF NOT EXISTS ix_parties_first_name_trgm ON parties USING GIN(first_name gin_trgm_ops);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_parties_last_name_trgm ON parties USING GIN(last_name gin_trgm_ops);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_parties_phone_trgm ON parties USING GIN(phone gin_trgm_ops);")

    # --- PATIENT NOTES: Full-text on title + content ---
    op.execute("""
        ALTER TABLE patient_notes
        ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
            to_tsvector('simple',
                coalesce(title, '') || ' ' ||
                coalesce(content, '')
            )
        ) STORED;
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_patient_notes_search_vector ON patient_notes USING GIN(search_vector);")

    # --- INVOICES: Full-text on invoice number + patient + device ---
    op.execute("""
        ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
            to_tsvector('simple',
                coalesce(invoice_number, '') || ' ' ||
                coalesce(patient_name, '') || ' ' ||
                coalesce(patient_tc, '') || ' ' ||
                coalesce(device_name, '') || ' ' ||
                coalesce(device_serial, '') || ' ' ||
                coalesce(notes, '')
            )
        ) STORED;
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_invoices_search_vector ON invoices USING GIN(search_vector);")

    # --- INVENTORY: Full-text on product name/brand/model ---
    op.execute("""
        ALTER TABLE inventory
        ADD COLUMN IF NOT EXISTS search_vector tsvector
        GENERATED ALWAYS AS (
            to_tsvector('simple',
                coalesce(name, '') || ' ' ||
                coalesce(brand, '') || ' ' ||
                coalesce(model, '') || ' ' ||
                coalesce(barcode, '') || ' ' ||
                coalesce(description, '')
            )
        ) STORED;
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_inventory_search_vector ON inventory USING GIN(search_vector);")

    # --- APPOINTMENTS: Trigram on notes for content search ---
    op.execute("CREATE INDEX IF NOT EXISTS ix_appointments_notes_trgm ON appointments USING GIN(notes gin_trgm_ops) WHERE notes IS NOT NULL;")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_appointments_notes_trgm;")
    op.execute("DROP INDEX IF EXISTS ix_inventory_search_vector;")
    op.execute("ALTER TABLE inventory DROP COLUMN IF EXISTS search_vector;")
    op.execute("DROP INDEX IF EXISTS ix_invoices_search_vector;")
    op.execute("ALTER TABLE invoices DROP COLUMN IF EXISTS search_vector;")
    op.execute("DROP INDEX IF EXISTS ix_patient_notes_search_vector;")
    op.execute("ALTER TABLE patient_notes DROP COLUMN IF EXISTS search_vector;")
    op.execute("DROP INDEX IF EXISTS ix_parties_phone_trgm;")
    op.execute("DROP INDEX IF EXISTS ix_parties_last_name_trgm;")
    op.execute("DROP INDEX IF EXISTS ix_parties_first_name_trgm;")
    op.execute("DROP INDEX IF EXISTS ix_parties_search_vector;")
    op.execute("ALTER TABLE parties DROP COLUMN IF EXISTS search_vector;")
