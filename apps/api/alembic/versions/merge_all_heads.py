"""merge all heads into single head

Revision ID: merge_all_heads
Revises: 0ee027507201, 3949b92728db, 63465ccc4d06, add_allow_impersonation, add_pkg_qty, bb847e64049b, ecomm001, ef70430aa16e
Create Date: 2026-03-17 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'merge_all_heads'
down_revision: Union[str, Sequence[str]] = (
    '0ee027507201',
    '3949b92728db',
    '63465ccc4d06',
    'add_allow_impersonation',
    'add_pkg_qty',
    'bb847e64049b',
    'ecomm001',
    'ef70430aa16e',
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
