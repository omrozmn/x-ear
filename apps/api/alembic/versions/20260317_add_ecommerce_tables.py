"""add e-commerce tables: product_media, cargo_integrations, marketplace_product_listings

Revision ID: ecomm001
Revises:
Create Date: 2026-03-17
"""
from alembic import op
import sqlalchemy as sa

revision = 'ecomm001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Product Media table
    op.create_table(
        'product_media',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('inventory_id', sa.String(50), sa.ForeignKey('inventory.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('media_type', sa.String(20), default='image'),
        sa.Column('url', sa.Text),
        sa.Column('s3_key', sa.String(500)),
        sa.Column('filename', sa.String(255)),
        sa.Column('mime_type', sa.String(100)),
        sa.Column('file_size', sa.Integer),
        sa.Column('width', sa.Integer),
        sa.Column('height', sa.Integer),
        sa.Column('sort_order', sa.Integer, default=0),
        sa.Column('is_primary', sa.Boolean, default=False),
        sa.Column('alt_text', sa.String(500)),
        sa.Column('source', sa.String(50), default='upload'),
        sa.Column('source_id', sa.String(255)),
        sa.Column('marketplace_compatibility', sa.Text),
        sa.Column('created_at', sa.DateTime),
        sa.Column('updated_at', sa.DateTime),
    )

    # Cargo Integrations table
    op.create_table(
        'cargo_integrations',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('platform', sa.String(50), nullable=False),
        sa.Column('name', sa.String(100)),
        sa.Column('api_key', sa.String(255)),
        sa.Column('api_secret', sa.String(255)),
        sa.Column('customer_id', sa.String(100)),
        sa.Column('other_params', sa.Text),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('status', sa.String(20), default='disconnected'),
        sa.Column('created_at', sa.DateTime),
        sa.Column('updated_at', sa.DateTime),
    )

    # Marketplace Product Listings table
    op.create_table(
        'marketplace_product_listings',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('inventory_id', sa.String(50), sa.ForeignKey('inventory.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('integration_id', sa.String(50), sa.ForeignKey('marketplace_integrations.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('listing_data', sa.Text),
        sa.Column('marketplace_title', sa.String(500)),
        sa.Column('marketplace_description', sa.Text),
        sa.Column('marketplace_price', sa.Float),
        sa.Column('marketplace_stock', sa.Integer),
        sa.Column('marketplace_barcode', sa.String(100)),
        sa.Column('marketplace_brand', sa.String(200)),
        sa.Column('marketplace_category_id', sa.String(100)),
        sa.Column('status', sa.String(20), default='draft'),
        sa.Column('remote_product_id', sa.String(100)),
        sa.Column('last_synced_at', sa.DateTime),
        sa.Column('error_message', sa.Text),
        sa.Column('created_at', sa.DateTime),
        sa.Column('updated_at', sa.DateTime),
    )


def downgrade():
    op.drop_table('marketplace_product_listings')
    op.drop_table('cargo_integrations')
    op.drop_table('product_media')
