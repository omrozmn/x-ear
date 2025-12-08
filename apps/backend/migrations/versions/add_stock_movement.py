"""Add stock movement model

Revision ID: add_stock_movement
Revises: add_invoice_edocument_fields
Create Date: 2025-12-08 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_stock_movement'
down_revision = 'add_invoice_edocument_fields'
branch_labels = None
depends_on = None


def upgrade():
    # Create stock_movements table
    op.create_table(
        'stock_movements',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('tenant_id', sa.String(length=36), nullable=False),
        sa.Column('inventory_id', sa.String(length=50), nullable=False),
        sa.Column('transaction_id', sa.String(length=50), nullable=True),
        sa.Column('movement_type', sa.String(length=20), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('serial_number', sa.String(length=100), nullable=True),
        sa.Column('created_by', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['inventory_id'], ['inventory.id'], ),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index(op.f('ix_stock_movements_inventory_id'), 'stock_movements', ['inventory_id'], unique=False)
    op.create_index(op.f('ix_stock_movements_tenant_id'), 'stock_movements', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_stock_movements_transaction_id'), 'stock_movements', ['transaction_id'], unique=False)
    op.create_index(op.f('ix_stock_movements_movement_type'), 'stock_movements', ['movement_type'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_stock_movements_movement_type'), table_name='stock_movements')
    op.drop_index(op.f('ix_stock_movements_transaction_id'), table_name='stock_movements')
    op.drop_index(op.f('ix_stock_movements_tenant_id'), table_name='stock_movements')
    op.drop_index(op.f('ix_stock_movements_inventory_id'), table_name='stock_movements')
    op.drop_table('stock_movements')
