"""Add serial_number_left and serial_number_right to devices

Revision ID: 20250120_add_device_serial_numbers
Revises: 20251215_fix_invoice_money_fields
Create Date: 2025-01-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250120_add_device_serial_numbers'
down_revision = '20251215_fix_invoice_money_fields'
branch_labels = None
depends_on = None


def upgrade():
    # Add new serial number columns for left and right ear
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    existing_columns = [col['name'] for col in inspector.get_columns('devices')]
    
    if 'serial_number_left' not in existing_columns:
        op.add_column('devices', sa.Column('serial_number_left', sa.String(100), nullable=True))
    
    if 'serial_number_right' not in existing_columns:
        op.add_column('devices', sa.Column('serial_number_right', sa.String(100), nullable=True))
    
    # Create indexes for better query performance
    try:
        op.create_index('ix_device_serial_left', 'devices', ['serial_number_left'], unique=False)
    except Exception:
        pass # Index likely exists

    try:
        op.create_index('ix_device_serial_right', 'devices', ['serial_number_right'], unique=False)
    except Exception:
        pass # Index likely exists
    
    # Make the original serial_number nullable (since we now have left/right specific fields)
    # Note: This is a SQLite-compatible approach
    with op.batch_alter_table('devices') as batch_op:
        batch_op.alter_column('serial_number', nullable=True)


def downgrade():
    # Remove indexes
    op.drop_index('ix_device_serial_right', table_name='devices')
    op.drop_index('ix_device_serial_left', table_name='devices')
    
    # Remove columns
    op.drop_column('devices', 'serial_number_right')
    op.drop_column('devices', 'serial_number_left')
