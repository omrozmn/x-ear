"""Add product_code to Tenant and retention_days to Plan

Revision ID: 20260113_phase0_columns
Revises: 20251229_commission_ledger
Create Date: 2026-01-13

Phase 0 Migration: Nullable columns with defaults, zero behavior change.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260113_phase0_columns'
down_revision: Union[str, None] = ('20251229_commission_ledger', '20250120_add_device_serial_numbers')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add product_code to tenants table
    # Nullable with default 'xear_hearing' for existing rows
    op.add_column('tenants', sa.Column('product_code', sa.String(50), nullable=True, server_default='xear_hearing'))
    
    # Add retention_days to plans table
    # Nullable with default 365 for existing rows
    op.add_column('plans', sa.Column('retention_days', sa.Integer(), nullable=True, server_default='365'))


def downgrade() -> None:
    op.drop_column('plans', 'retention_days')
    op.drop_column('tenants', 'product_code')
