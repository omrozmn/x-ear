"""merge_tech_specs_and_impersonation

Revision ID: 894e4a02bb88
Revises: 20260615_tech_specs, add_allow_impersonation
Create Date: 2026-03-14 20:01:39.197578

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '894e4a02bb88'
down_revision: Union[str, None] = ('20260615_tech_specs', 'add_allow_impersonation')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
