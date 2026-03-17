"""add missing tenant columns (sector, country_code, deleted_at)

Revision ID: add_tenant_cols
Revises: merge_all_heads
Create Date: 2026-03-18 01:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect as sa_inspect


revision: str = 'add_tenant_cols'
down_revision: Union[str, None] = 'merge_all_heads'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa_inspect(conn)
    existing = {c['name'] for c in inspector.get_columns('tenants')}

    if 'sector' not in existing:
        op.add_column('tenants', sa.Column('sector', sa.String(30), nullable=True))
    if 'country_code' not in existing:
        op.add_column('tenants', sa.Column('country_code', sa.String(2), nullable=True))
    if 'deleted_at' not in existing:
        op.add_column('tenants', sa.Column('deleted_at', sa.DateTime(), nullable=True))
    if 'is_active' not in existing:
        op.add_column('tenants', sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False))


def downgrade() -> None:
    op.drop_column('tenants', 'is_active')
    op.drop_column('tenants', 'deleted_at')
    op.drop_column('tenants', 'country_code')
    op.drop_column('tenants', 'sector')
