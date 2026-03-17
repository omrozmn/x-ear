"""add tenant contact fields

Revision ID: 20260306_154345
Revises: 
Create Date: 2026-03-06 15:43:45.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260306_154345'
down_revision = '7f394706f6dc'  # Latest migration
branch_labels = None
depends_on = None


def upgrade():
    # Add contact fields to tenants table
    op.add_column('tenants', sa.Column('phone', sa.String(length=50), nullable=True))
    op.add_column('tenants', sa.Column('email', sa.String(length=255), nullable=True))
    op.add_column('tenants', sa.Column('address', sa.Text(), nullable=True))
    op.add_column('tenants', sa.Column('city', sa.String(length=100), nullable=True))
    op.add_column('tenants', sa.Column('tax_number', sa.String(length=50), nullable=True))
    op.add_column('tenants', sa.Column('tax_office', sa.String(length=100), nullable=True))


def downgrade():
    # Remove contact fields from tenants table
    op.drop_column('tenants', 'tax_office')
    op.drop_column('tenants', 'tax_number')
    op.drop_column('tenants', 'city')
    op.drop_column('tenants', 'address')
    op.drop_column('tenants', 'email')
    op.drop_column('tenants', 'phone')
