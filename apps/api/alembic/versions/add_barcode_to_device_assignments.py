"""add barcode to device_assignments

Revision ID: add_barcode_da
Revises: make_inventory_brand_nullable
Create Date: 2026-02-28 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_barcode_da'
down_revision = 'make_brand_nullable'
branch_labels = None
depends_on = None


def upgrade():
    # Add barcode column to device_assignments table
    op.add_column('device_assignments', sa.Column('barcode', sa.String(length=100), nullable=True))


def downgrade():
    # Remove barcode column from device_assignments table
    op.drop_column('device_assignments', 'barcode')
