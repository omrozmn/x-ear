"""add timestamps to deliverability_metrics

Revision ID: 20260217_deliverability_ts
Revises: 
Create Date: 2026-02-17 14:10:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime, timezone

# revision identifiers, used by Alembic.
revision = '20260217_deliverability_ts'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add created_at and updated_at columns to deliverability_metrics
    with op.batch_alter_table('deliverability_metrics', schema=None) as batch_op:
        batch_op.add_column(sa.Column('created_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('updated_at', sa.DateTime(), nullable=True))
    
    # Set default values for existing rows
    op.execute(f"UPDATE deliverability_metrics SET created_at = '{datetime.now(timezone.utc).isoformat()}' WHERE created_at IS NULL")
    op.execute(f"UPDATE deliverability_metrics SET updated_at = '{datetime.now(timezone.utc).isoformat()}' WHERE updated_at IS NULL")


def downgrade():
    with op.batch_alter_table('deliverability_metrics', schema=None) as batch_op:
        batch_op.drop_column('updated_at')
        batch_op.drop_column('created_at')
