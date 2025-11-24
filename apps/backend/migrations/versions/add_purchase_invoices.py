"""Add purchase invoice models

Revision ID: add_purchase_invoices
Revises: (previous_revision_id)
Create Date: 2025-01-23 15:10:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_purchase_invoices'
down_revision = None  # Update this with the latest migration ID
branch_labels = None
depends_on = None


def upgrade():
    # Create purchase_invoices table
    op.create_table(
        'purchase_invoices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('birfatura_uuid', sa.String(length=100), nullable=False),
        sa.Column('invoice_number', sa.String(length=100), nullable=True),
        sa.Column('invoice_date', sa.DateTime(), nullable=False),
        sa.Column('invoice_type', sa.String(length=50), nullable=True),
        sa.Column('sender_name', sa.String(length=200), nullable=False),
        sa.Column('sender_tax_number', sa.String(length=50), nullable=False),
        sa.Column('sender_tax_office', sa.String(length=100), nullable=True),
        sa.Column('sender_address', sa.Text(), nullable=True),
        sa.Column('sender_city', sa.String(length=100), nullable=True),
        sa.Column('supplier_id', sa.Integer(), nullable=True),
        sa.Column('currency', sa.String(length=10), nullable=True),
        sa.Column('subtotal', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('tax_amount', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('total_amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('raw_data', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('is_matched', sa.Boolean(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_purchase_invoices_birfatura_uuid'), 'purchase_invoices', ['birfatura_uuid'], unique=True)
    op.create_index(op.f('ix_purchase_invoices_invoice_date'), 'purchase_invoices', ['invoice_date'], unique=False)
    op.create_index(op.f('ix_purchase_invoices_invoice_number'), 'purchase_invoices', ['invoice_number'], unique=False)
    op.create_index(op.f('ix_purchase_invoices_sender_tax_number'), 'purchase_invoices', ['sender_tax_number'], unique=False)
    op.create_index(op.f('ix_purchase_invoices_supplier_id'), 'purchase_invoices', ['supplier_id'], unique=False)

    # Create purchase_invoice_items table
    op.create_table(
        'purchase_invoice_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('purchase_invoice_id', sa.Integer(), nullable=False),
        sa.Column('product_code', sa.String(length=100), nullable=True),
        sa.Column('product_name', sa.String(length=200), nullable=False),
        sa.Column('product_description', sa.Text(), nullable=True),
        sa.Column('quantity', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('unit', sa.String(length=50), nullable=True),
        sa.Column('unit_price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('tax_rate', sa.Integer(), nullable=True),
        sa.Column('tax_amount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('line_total', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('inventory_id', sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(['inventory_id'], ['inventory.id'], ),
        sa.ForeignKeyConstraint(['purchase_invoice_id'], ['purchase_invoices.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_purchase_invoice_items_purchase_invoice_id'), 'purchase_invoice_items', ['purchase_invoice_id'], unique=False)

    # Create suggested_suppliers table
    op.create_table(
        'suggested_suppliers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('company_name', sa.String(length=200), nullable=False),
        sa.Column('tax_number', sa.String(length=50), nullable=False),
        sa.Column('tax_office', sa.String(length=100), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('invoice_count', sa.Integer(), nullable=True),
        sa.Column('total_amount', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('first_invoice_date', sa.DateTime(), nullable=True),
        sa.Column('last_invoice_date', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('accepted_at', sa.DateTime(), nullable=True),
        sa.Column('accepted_by', sa.String(length=100), nullable=True),
        sa.Column('supplier_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_suggested_suppliers_tax_number'), 'suggested_suppliers', ['tax_number'], unique=True)


def downgrade():
    # Drop tables in reverse order
    op.drop_index(op.f('ix_suggested_suppliers_tax_number'), table_name='suggested_suppliers')
    op.drop_table('suggested_suppliers')
    
    op.drop_index(op.f('ix_purchase_invoice_items_purchase_invoice_id'), table_name='purchase_invoice_items')
    op.drop_table('purchase_invoice_items')
    
    op.drop_index(op.f('ix_purchase_invoices_supplier_id'), table_name='purchase_invoices')
    op.drop_index(op.f('ix_purchase_invoices_sender_tax_number'), table_name='purchase_invoices')
    op.drop_index(op.f('ix_purchase_invoices_invoice_number'), table_name='purchase_invoices')
    op.drop_index(op.f('ix_purchase_invoices_invoice_date'), table_name='purchase_invoices')
    op.drop_index(op.f('ix_purchase_invoices_birfatura_uuid'), table_name='purchase_invoices')
    op.drop_table('purchase_invoices')
