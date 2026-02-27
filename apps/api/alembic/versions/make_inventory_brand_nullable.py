"""make inventory brand nullable

Revision ID: make_brand_nullable
Revises: fix_sequences_id_column
Create Date: 2026-02-23 11:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'make_brand_nullable'
down_revision = 'fix_sequences_id_column'
branch_labels = None
depends_on = None


def upgrade():
    # Make brand column nullable
    with op.batch_alter_table('inventory', schema=None) as batch_op:
        batch_op.alter_column('brand',
                              existing_type=sa.String(length=100),
                              nullable=True)


def downgrade():
    # Revert brand column to NOT NULL
    with op.batch_alter_table('inventory', schema=None) as batch_op:
        batch_op.alter_column('brand',
                              existing_type=sa.String(length=100),
                              nullable=False)
