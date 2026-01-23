"""merge multiple heads

Revision ID: 1bb75899616e
Revises: 1db2577c631f, 20251011_add_idempotency_table
Create Date: 2025-10-13 01:23:01.580468

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1bb75899616e'
down_revision: Union[str, None] = ('1db2577c631f', '20251011_add_idempotency_table')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
