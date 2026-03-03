"""merge discount fields and intent data heads

Revision ID: 1cc8cbfc8370
Revises: 20260302_discount_fields, bb847e64049b
Create Date: 2026-03-03 10:29:26.831223

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1cc8cbfc8370'
down_revision: Union[str, None] = ('20260302_discount_fields', 'bb847e64049b')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
