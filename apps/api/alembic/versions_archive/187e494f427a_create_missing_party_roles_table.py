"""create_missing_party_roles_table

Revision ID: 187e494f427a
Revises: ad4071991481
Create Date: 2026-01-23 13:38:29.001406

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '187e494f427a'
down_revision: Union[str, None] = 'ad4071991481'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Create party_roles table if it doesn't exist.
    This table was supposed to be created by 20260114_party_role_profile migration
    but appears to be missing from the database.
    """
    # Check if table already exists
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    table_names = inspector.get_table_names()
    
    if 'party_roles' not in table_names:
        # Create party_roles table
        op.create_table(
            'party_roles',
            sa.Column('id', sa.String(50), primary_key=True),
            sa.Column('party_id', sa.String(50), sa.ForeignKey('parties.id'), nullable=False),
            sa.Column('role_code', sa.String(20), nullable=False),
            sa.Column('assigned_at', sa.DateTime),
            sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id'), nullable=True),
            sa.Column('created_at', sa.DateTime),
            sa.Column('updated_at', sa.DateTime),
        )
        
        # Create indexes
        op.create_index('ix_party_roles_party_id', 'party_roles', ['party_id'])
        op.create_index('ix_party_roles_tenant_id', 'party_roles', ['tenant_id'])


def downgrade() -> None:
    """
    Drop party_roles table.
    """
    op.drop_table('party_roles')
