"""add_allow_impersonation_to_users

Revision ID: add_allow_impersonation
Revises: noah_import_001
Create Date: 2026-03-15 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_allow_impersonation'
down_revision: Union[str, None] = 'noah_import_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add allow_impersonation column if not already present (initial schema may include it)
    from sqlalchemy import inspect as sa_inspect
    conn = op.get_bind()
    inspector = sa_inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('users')]
    if 'allow_impersonation' not in columns:
        op.add_column('users', sa.Column(
            'allow_impersonation', sa.Boolean(),
            nullable=False, server_default='0'
        ))
    # Enable for all existing users during development (use TRUE for PostgreSQL compat)
    op.execute("UPDATE users SET allow_impersonation = TRUE")


def downgrade() -> None:
    op.drop_column('users', 'allow_impersonation')
