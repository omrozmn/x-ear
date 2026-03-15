"""add hearing aid technical specification columns to inventory

Revision ID: 20260615_tech_specs
Revises: 20260312_180500, 63465ccc4d06, noah_import_001
Create Date: 2026-06-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = '20260615_tech_specs'
down_revision: Union[str, None] = ('20260312_180500', '63465ccc4d06', 'noah_import_001')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_columns = {col['name'] for col in inspector.get_columns('inventory')}

    with op.batch_alter_table('inventory') as batch_op:
        if 'max_output_spl' not in existing_columns:
            batch_op.add_column(sa.Column('max_output_spl', sa.Integer(), nullable=True))
        if 'max_gain' not in existing_columns:
            batch_op.add_column(sa.Column('max_gain', sa.Integer(), nullable=True))
        if 'fitting_range_min' not in existing_columns:
            batch_op.add_column(sa.Column('fitting_range_min', sa.Integer(), nullable=True))
        if 'fitting_range_max' not in existing_columns:
            batch_op.add_column(sa.Column('fitting_range_max', sa.Integer(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('inventory') as batch_op:
        batch_op.drop_column('fitting_range_max')
        batch_op.drop_column('fitting_range_min')
        batch_op.drop_column('max_gain')
        batch_op.drop_column('max_output_spl')
