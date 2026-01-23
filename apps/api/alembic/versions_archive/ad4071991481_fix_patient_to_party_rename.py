"""fix_patient_to_party_rename

Revision ID: ad4071991481
Revises: 20260123_create_ai_tables
Create Date: 2026-01-23 13:14:02.920717

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ad4071991481'
down_revision: Union[str, None] = '20260123_create_ai_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Actually rename patients table to parties and update all foreign keys.
    This fixes the incomplete migration from 20260114_rename_patients_to_parties.
    """
    # 1. First, rename the main table (if it still exists as 'patients')
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    table_names = inspector.get_table_names()
    
    if 'patients' in table_names and 'parties' not in table_names:
        op.rename_table('patients', 'parties')
    elif 'parties' in table_names:
        # Table already renamed, skip
        pass
    else:
        raise Exception("Neither 'patients' nor 'parties' table found!")
    
    # 2. Update all foreign key columns from patient_id to party_id
    # SQLite requires batch mode for column operations
    tables_with_patient_fk = [
        'appointments',
        'communication_history',
        'device_assignments',
        'device_replacements',
        'devices',
        'email_logs',
        'ereceipts',
        'hearing_tests',
        'invoices',
        'patient_notes',
        'payment_records',
        'proformas',
        'promissory_notes',
        'replacements',
        'sales',
        'scan_queue',
        'sms_logs',
    ]
    
    for table_name in tables_with_patient_fk:
        # Check if table exists and has patient_id column
        conn = op.get_bind()
        inspector = sa.inspect(conn)
        
        if table_name not in inspector.get_table_names():
            continue
            
        columns = [col['name'] for col in inspector.get_columns(table_name)]
        if 'patient_id' not in columns:
            continue
        
        # Rename patient_id to party_id
        with op.batch_alter_table(table_name, schema=None) as batch_op:
            batch_op.alter_column('patient_id', new_column_name='party_id')


def downgrade() -> None:
    """
    Revert parties back to patients.
    """
    # 1. Rename columns back
    tables_with_party_fk = [
        'appointments',
        'communication_history',
        'device_assignments',
        'device_replacements',
        'devices',
        'email_logs',
        'ereceipts',
        'hearing_tests',
        'invoices',
        'patient_notes',
        'payment_records',
        'proformas',
        'promissory_notes',
        'replacements',
        'sales',
        'scan_queue',
        'sms_logs',
    ]
    
    for table_name in tables_with_party_fk:
        conn = op.get_bind()
        inspector = sa.inspect(conn)
        
        if table_name not in inspector.get_table_names():
            continue
            
        columns = [col['name'] for col in inspector.get_columns(table_name)]
        if 'party_id' not in columns:
            continue
        
        with op.batch_alter_table(table_name, schema=None) as batch_op:
            batch_op.alter_column('party_id', new_column_name='patient_id')
    
    # 2. Rename table back
    op.rename_table('parties', 'patients')
