"""add package_quantity to inventory

Revision ID: add_pkg_qty
Revises: 20260316_sales_owner
Create Date: 2026-03-16 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_pkg_qty'
down_revision = '20260316_sales_owner'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('inventory', schema=None) as batch_op:
        batch_op.add_column(sa.Column('package_quantity', sa.Integer(), nullable=True))


def downgrade():
    with op.batch_alter_table('inventory', schema=None) as batch_op:
        batch_op.drop_column('package_quantity')
