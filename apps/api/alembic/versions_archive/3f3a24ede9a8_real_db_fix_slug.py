"""real_db_fix_slug

Revision ID: 3f3a24ede9a8
Revises: c668e52866c3
Create Date: 2026-01-19 13:42:08.521585

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3f3a24ede9a8'
down_revision: Union[str, None] = 'c668e52866c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Manual simplified upgrade to fix missing tenant columns on real DB (SQLITE)
    # Skipping ALTER COLUMN and other complex ops that might fail on SQLite without batch mode
    
    # We use explicit add_column. If column exists, it will fail, so we can wrap in try/except or just let it fail if user wants to know.
    # But since autogenerate detected them as missing, they are likely missing.
    # To be safe against "duplicate column name" error (if state is mixed), we can inspect.
    
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('tenants')]
    
    if 'description' not in columns:
        op.add_column('tenants', sa.Column('description', sa.Text(), nullable=True))
        
    if 'affiliate_id' not in columns:
        op.add_column('tenants', sa.Column('affiliate_id', sa.Integer(), nullable=True))
        
    if 'referral_code' not in columns:
        op.add_column('tenants', sa.Column('referral_code', sa.String(length=50), nullable=True))
        
    if 'current_plan_id' not in columns:
        op.add_column('tenants', sa.Column('current_plan_id', sa.String(length=36), nullable=True))
        
    if 'subscription_start_date' not in columns:
        op.add_column('tenants', sa.Column('subscription_start_date', sa.DateTime(), nullable=True))
        
    if 'feature_usage' not in columns:
        op.add_column('tenants', sa.Column('feature_usage', sa.JSON(), nullable=True))

    if 'max_users' not in columns:
        op.add_column('tenants', sa.Column('max_users', sa.Integer(), nullable=True))

    if 'current_users' not in columns:
        op.add_column('tenants', sa.Column('current_users', sa.Integer(), nullable=True))
        
    if 'max_branches' not in columns:
        op.add_column('tenants', sa.Column('max_branches', sa.Integer(), nullable=True))
        
    if 'current_branches' not in columns:
        op.add_column('tenants', sa.Column('current_branches', sa.Integer(), nullable=True))
        
    if 'company_info' not in columns:
        op.add_column('tenants', sa.Column('company_info', sa.JSON(), nullable=True))
    
    if 'settings' not in columns:
        op.add_column('tenants', sa.Column('settings', sa.JSON(), nullable=True))
        
    if 'deleted_at' not in columns:
        op.add_column('tenants', sa.Column('deleted_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    pass
