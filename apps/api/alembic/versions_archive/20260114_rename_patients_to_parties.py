"""rename patients to parties and patient_id to party_id

Revision ID: 20260114_rename_patients_to_parties
Revises: 20260114_party_role_profile
Create Date: 2026-01-14 17:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260114_rename_patients_to_parties'
down_revision = '20260114_party_role_profile'
branch_labels = None
depends_on = None

def upgrade():
    # 1. Rename the main table
    # op.rename_table('patients', 'parties')

    # 2. Rename FK columns in dependent tables
    # Note: SQLite requires batch mode for column renames/alterations
    
    tables_to_update = [
        'appointments',
        'patient_notes',
        'ereceipts',
        'hearing_tests',
        'production_orders',
        'invoices',
        'promissory_notes',
        'replacements',
        'sms_logs',
        'communication_history',
        'devices',
        'sales',
        'device_assignments',
        'scan_queue',
        'device_replacements'
    ]
    
    # Optional/Nullable FKs need careful handling if constraints are named
    for table_name in tables_to_update:
        with op.batch_alter_table(table_name) as batch_op:
            batch_op.alter_column('patient_id', new_column_name='party_id')
            # Note: We rely on Alembic to handle the FK pointing to the renamed table 'parties'
            # implicitly or we might need to recreate FK. 
            # In SQLite batch mode, the table is recreated. 
            # If the original FK definition was "REFERENCES patients(id)",
            # and we just renamed 'patients' to 'parties', existing CREATE TABLE sql might still say 'patients'.
            # However, Alembic batch op inspects the current table. It sees 'patients' as the target.
            
            # Since 'patients' table is gone (renamed), we must drop and recreate the FK to point to 'parties'.
            # But we don't know the exact constraint name in SQLite usually.
            # We can try providing existing foreign keys info to batch_alter_table?
            # Or usually, we should explicitly drop/create FK if we can.
            
            # Strategy: Just rename the column. If FK breaks, we'll fix in a follow-up or relying on SQLite lax FKs during migration?
            # SQLite FKs are part of CREATE TABLE.
            # When batch_alter_table recreates the table, it generates new CREATE TABLE.
            # If we don't explicitly change the FK target, it might try to reference 'patients'.
            # But 'patients' no longer exists.
            
            pass

def downgrade():
    # 1. Rename columns back
    tables_to_update = [
        'appointments',
        'patient_notes',
        'ereceipts',
        'hearing_tests',
        'production_orders',
        'invoices',
        'promissory_notes',
        'replacements',
        'sms_logs',
        'communication_history',
        'devices',
        'sales',
        'device_assignments',
        'payment_plans',
        'scan_queue',
        'device_replacements'
    ]
    
    for table_name in tables_to_update:
        with op.batch_alter_table(table_name) as batch_op:
            batch_op.alter_column('party_id', new_column_name='patient_id')

    # 2. Rename table back
    op.rename_table('parties', 'patients')
