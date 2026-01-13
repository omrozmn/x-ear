"""Add price_includes_kdv and cost_includes_kdv to inventory table

Revision ID: 20251116_add_price_includes_kdv_to_inventory
Revises: 20251116_add_kdv_rate_to_inventory
Create Date: 2025-11-16
"""

from alembic import op
import sqlalchemy as sa

revision = '20251116_add_price_includes_kdv_to_inventory'
down_revision = '20251116_add_kdv_rate_to_inventory'
branch_labels = None
depends_on = None


def upgrade():
    # Add columns with default False for existing rows
    try:
        op.add_column('inventory', sa.Column('price_includes_kdv', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    except Exception:
        pass
    try:
        op.add_column('inventory', sa.Column('cost_includes_kdv', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    except Exception:
        pass


def downgrade():
    try:
        op.drop_column('inventory', 'price_includes_kdv')
    except Exception:
        pass
    try:
        op.drop_column('inventory', 'cost_includes_kdv')
    except Exception:
        pass
