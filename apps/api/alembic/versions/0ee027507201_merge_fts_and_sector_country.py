"""merge fts and sector_country

Revision ID: 0ee027507201
Revises: fts_001, 20260317_010000
Create Date: 2026-03-17 15:19:54.616068

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0ee027507201'
down_revision: Union[str, None] = ('fts_001', '20260317_010000')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
