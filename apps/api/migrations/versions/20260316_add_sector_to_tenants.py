"""Add sector column to tenants table

Revision ID: 20260316_sector
Revises: None
Create Date: 2026-03-16
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '20260316_sector'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add sector column with default 'hearing' for all existing tenants
    op.add_column(
        'tenants',
        sa.Column('sector', sa.String(30), nullable=False, server_default='hearing')
    )
    op.create_index('idx_tenants_sector', 'tenants', ['sector'])


def downgrade() -> None:
    op.drop_index('idx_tenants_sector', table_name='tenants')
    op.drop_column('tenants', 'sector')
