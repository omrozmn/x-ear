
"""Rev 4: Add ocr_requests_count to subscriptions

Revision ID: rev4_ocr_count
Revises: 20260113_phase0_columns
Create Date: 2026-01-13 12:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'rev4_ocr_count'
down_revision = '20260113_phase0_columns'  # Depends on Phase 0 migration
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Add ocr_requests_count column to subscriptions table
    # Nullable with default 0
    op.add_column('subscriptions', sa.Column('ocr_requests_count', sa.Integer(), nullable=True, server_default='0'))

def downgrade() -> None:
    op.drop_column('subscriptions', 'ocr_requests_count')
