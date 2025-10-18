"""merge heads

Revision ID: 6f9446f20706
Revises: 1bb75899616e, 20251013_fix_idempotency_array_shape
Create Date: 2025-10-13 16:57:49.064002

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6f9446f20706'
down_revision: Union[str, None] = ('1bb75899616e', '20251013_fix_idempotency_array_shape')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
