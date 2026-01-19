"""create party_roles and hearing_profiles tables

Revision ID: 20260114_party_role_profile
Revises: 20260113_phase3_tenant_type
Create Date: 2026-01-14 17:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260114_party_role_profile'
down_revision = '20260113_phase3_tenant_type'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('party_roles',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('party_id', sa.String(50), nullable=False),
        sa.Column('role_code', sa.String(20), nullable=False),
        sa.Column('assigned_at', sa.DateTime),
        sa.Column('tenant_id', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime),
        sa.Column('updated_at', sa.DateTime),
    )
    op.create_index('ix_party_roles_party_id', 'party_roles', ['party_id'])
    op.create_index('ix_party_roles_tenant_id', 'party_roles', ['tenant_id'])

    op.create_table('hearing_profiles',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('party_id', sa.String(50), nullable=False),
        sa.Column('sgk_info', sa.Text),
        sa.Column('created_at', sa.DateTime),
        sa.Column('updated_at', sa.DateTime),
        sa.Column('tenant_id', sa.String(36), nullable=True)
    )
    op.create_index('ix_hearing_profiles_party_id', 'hearing_profiles', ['party_id'], unique=True)
    op.create_index('ix_hearing_profiles_tenant_id', 'hearing_profiles', ['tenant_id'])

def downgrade():
    op.drop_table('hearing_profiles')
    op.drop_table('party_roles')
