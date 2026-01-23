"""
Create affiliate_user table

Revision ID: 20251229_affiliate_user
Revises: 20251215_fix_invoice_money_fields
Create Date: 2025-12-29
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20251229_affiliate_user'
down_revision = '20251215_fix_invoice_money_fields'
branch_labels = None
depends_on = None


def upgrade():
    # Create table check
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    
    if 'affiliate_user' not in inspector.get_table_names():
        op.create_table(
            'affiliate_user',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('email', sa.String(length=255), nullable=False, unique=True, index=True),
            sa.Column('password_hash', sa.String(length=255), nullable=False),
            sa.Column('iban', sa.String(length=34), nullable=False),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.sql.expression.true()),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

def downgrade():
    op.drop_table('affiliate_user')
