"""Merge heads

Revision ID: aab66873a35b
Revises: 20250120_add_device_serial_numbers, 20251116_add_price_includes_kdv_to_inventory
Create Date: 2025-11-25 16:28:41.571270

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'aab66873a35b'
down_revision: Union[str, None] = ('20250120_add_device_serial_numbers', '20251116_add_price_includes_kdv_to_inventory')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
