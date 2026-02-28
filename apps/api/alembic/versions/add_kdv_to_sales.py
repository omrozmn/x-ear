"""Add kdv_rate and kdv_amount to sales table

Revision ID: add_kdv_to_sales
Revises: add_barcode_da
Create Date: 2025-03-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_kdv_to_sales'
down_revision = 'add_barcode_da'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add kdv_rate column (default 20% for Turkey)
    op.add_column('sales', sa.Column('kdv_rate', sa.Float(), nullable=True, server_default='20.0'))
    
    # Add kdv_amount column
    op.add_column('sales', sa.Column('kdv_amount', sa.Numeric(12, 2), nullable=True, server_default='0.0'))


def downgrade() -> None:
    op.drop_column('sales', 'kdv_amount')
    op.drop_column('sales', 'kdv_rate')
