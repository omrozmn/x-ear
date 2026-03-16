"""merge heads for countries

Revision ID: e6c4aac1d6b1
Revises: a1b2c3d4e5f6, add_pkg_qty
Create Date: 2026-03-16 07:07:49.043624

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e6c4aac1d6b1'
down_revision: Union[str, None] = ('a1b2c3d4e5f6', 'add_pkg_qty')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
