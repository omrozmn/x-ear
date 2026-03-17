"""add_intent_data_column

Revision ID: bb847e64049b
Revises: 343c8749d419
Create Date: 2026-02-21 19:25:45.163769

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bb847e64049b'
down_revision: Union[str, None] = '343c8749d419'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add intent_data column to ai_requests table
    op.add_column('ai_requests', sa.Column('intent_data', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('ai_requests', 'intent_data')
