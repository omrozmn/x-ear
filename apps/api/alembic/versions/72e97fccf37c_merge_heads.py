"""merge_heads

Revision ID: 72e97fccf37c
Revises: 20260217_deliverability_ts, 3949b92728db
Create Date: 2026-02-18 12:43:10.035101

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '72e97fccf37c'
down_revision: Union[str, None] = ('20260217_deliverability_ts', '3949b92728db')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
