"""merge affiliate_user and activity heads

Revision ID: ab96a7436c24
Revises: 20251203_extend_activity, 20251229_affiliate_user
Create Date: 2025-12-29 23:52:35.484781

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ab96a7436c24'
down_revision: Union[str, None] = ('20251203_extend_activity', '20251229_affiliate_user')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
