"""add_tenant_id_to_notification_templates

Revision ID: 20260217_notif_tenant
Revises: 20260217_add_notes
Create Date: 2026-02-17 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260217_notif_tenant'
down_revision = '20260217_add_notes'
branch_labels = None
depends_on = None


def upgrade():
    # Add tenant_id column to notification_templates
    op.add_column('notification_templates', sa.Column('tenant_id', sa.String(50), nullable=True))
    
    # Add index for tenant_id
    op.create_index('ix_notification_templates_tenant_id', 'notification_templates', ['tenant_id'])


def downgrade():
    # Remove index
    op.drop_index('ix_notification_templates_tenant_id', 'notification_templates')
    
    # Remove column
    op.drop_column('notification_templates', 'tenant_id')
