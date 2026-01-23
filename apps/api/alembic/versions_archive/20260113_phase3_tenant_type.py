"""add tenant_type column

Revision ID: 20260113_phase3_tenant_type
Revises: 20260113_phase1_ocr
Create Date: 2026-01-13 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision = '20260113_phase3_tenant_type'
down_revision = 'rev4_ocr_count'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    columns = [col['name'] for col in inspector.get_columns('tenants')]

    if 'tenant_type' not in columns:
        op.add_column('tenants', sa.Column('tenant_type', sa.String(length=20), server_default='B2B', nullable=False))
        op.create_index('idx_tenants_type', 'tenants', ['tenant_type'], unique=False)


def downgrade():
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    columns = [col['name'] for col in inspector.get_columns('tenants')]

    if 'tenant_type' in columns:
        op.drop_index('idx_tenants_type', table_name='tenants')
        op.drop_column('tenants', 'tenant_type')
