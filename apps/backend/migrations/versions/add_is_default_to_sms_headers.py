"""add is_default to sms_header_requests

Revision ID: add_is_default_sms
Revises: 
Create Date: 2026-01-04 00:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_is_default_sms'
down_revision = None  # Update this with your latest migration ID
branch_labels = None
depends_on = None


def upgrade():
    # Add is_default column to sms_header_requests table
    op.add_column('sms_header_requests', 
        sa.Column('is_default', sa.Boolean(), nullable=True, server_default='0')
    )
    
    # Set the first approved header for each tenant as default
    op.execute("""
        UPDATE sms_header_requests
        SET is_default = 1
        WHERE id IN (
            SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at ASC) as rn
                FROM sms_header_requests
                WHERE status = 'approved'
            ) t
            WHERE rn = 1
        )
    """)


def downgrade():
    # Remove is_default column
    op.drop_column('sms_header_requests', 'is_default')
