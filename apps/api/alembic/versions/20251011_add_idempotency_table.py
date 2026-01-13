"""
Add idempotency_keys table for DB-backed idempotency fallback

Revision ID: 20251011_add_idempotency_table
Revises: 20251011_fix_invoices_device_id_type
Create Date: 2025-10-11 00:30:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20251011_add_idempotency_table'
down_revision = '20251011_fix_invoices_device_id_type'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'idempotency_keys',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('idempotency_key', sa.String(length=128), nullable=False),
        sa.Column('endpoint', sa.String(length=256), nullable=False),
        sa.Column('user_id', sa.String(length=128), nullable=True),
        sa.Column('processing', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('status_code', sa.Integer(), nullable=True),
        sa.Column('response_json', sa.Text(), nullable=True),
        sa.Column('headers_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('idempotency_key', 'endpoint', 'user_id', name='uix_idempotency_key_endpoint_user')
    )


def downgrade():
    op.drop_table('idempotency_keys')
