"""
Create commission_ledger table

Revision ID: 20251229_commission_ledger
Revises: ab96a7436c24
Create Date: 2025-12-29
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20251229_commission_ledger'
down_revision = 'ab96a7436c24'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'commission_ledger',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('affiliate_id', sa.Integer(), sa.ForeignKey('affiliate_user.id'), nullable=False, index=True),
        sa.Column('tenant_id', sa.Integer(), nullable=False, index=True),
        sa.Column('event', sa.String(length=64), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

def downgrade():
    op.drop_table('commission_ledger')
