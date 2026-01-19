"""merge_heads

Revision ID: e3d7136f1070
Revises: 20260114_rename_patients_to_parties, 20260116_migrate_permission_strings
Create Date: 2026-01-19 12:11:00.024621

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e3d7136f1070'
down_revision: Union[str, None] = ('20260114_rename_patients_to_parties', '20260116_migrate_permission_strings')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
