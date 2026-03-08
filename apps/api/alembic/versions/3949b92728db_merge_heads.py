"""merge_heads

Revision ID: 3949b92728db
Revises: 20260217_notif_tenant, ef70430aa16e
Create Date: 2026-02-17 16:20:39.467632

"""
from typing import Sequence, Union



# revision identifiers, used by Alembic.
revision: str = '3949b92728db'
down_revision: Union[str, None] = ('20260217_notif_tenant', 'ef70430aa16e')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
