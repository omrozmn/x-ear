"""Add POS fields to PaymentRecord

Revision ID: add_pos_fields_to_payment_record
Revises: add_stock_movement
Create Date: 2025-12-08 20:10:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_pos_fields_to_payment_record'
down_revision = 'add_stock_movement'
branch_labels = None
depends_on = None


def upgrade():
    # Add POS related columns to payment_records
    op.add_column('payment_records', sa.Column('pos_provider', sa.String(length=50), nullable=True))
    op.add_column('payment_records', sa.Column('pos_transaction_id', sa.String(length=100), nullable=True))
    op.add_column('payment_records', sa.Column('pos_status', sa.String(length=50), nullable=True))
    op.add_column('payment_records', sa.Column('installment_count', sa.Integer(), nullable=True, server_default='1'))
    op.add_column('payment_records', sa.Column('is_3d_secure', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('payment_records', sa.Column('pos_raw_response', sa.JSON(), nullable=True))
    op.add_column('payment_records', sa.Column('gross_amount', sa.Numeric(precision=12, scale=2), nullable=True))
    op.add_column('payment_records', sa.Column('net_amount', sa.Numeric(precision=12, scale=2), nullable=True))
    op.add_column('payment_records', sa.Column('error_message', sa.Text(), nullable=True))

    # Create index for pos_transaction_id
    op.create_index(op.f('ix_payment_records_pos_transaction_id'), 'payment_records', ['pos_transaction_id'], unique=False)


def downgrade():
    # Remove columns and index
    op.drop_index(op.f('ix_payment_records_pos_transaction_id'), table_name='payment_records')
    op.drop_column('payment_records', 'error_message')
    op.drop_column('payment_records', 'net_amount')
    op.drop_column('payment_records', 'gross_amount')
    op.drop_column('payment_records', 'pos_raw_response')
    op.drop_column('payment_records', 'is_3d_secure')
    op.drop_column('payment_records', 'installment_count')
    op.drop_column('payment_records', 'pos_status')
    op.drop_column('payment_records', 'pos_transaction_id')
    op.drop_column('payment_records', 'pos_provider')
