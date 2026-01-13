"""Add kdv_rate column to inventory table (idempotent)

Revision ID: 20251116_add_kdv_rate_to_inventory
Revises: 6f9446f20706
Create Date: 2025-11-16 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from typing import Union, Sequence

# revision identifiers, used by Alembic.
revision: str = '20251116_add_kdv_rate_to_inventory'
down_revision: Union[str, Sequence[str], None] = '6f9446f20706'
branch_labels = None
depends_on = None


def _has_column(connection, table_name: str, column_name: str) -> bool:
    try:
        rows = connection.exec_driver_sql(f"PRAGMA table_info('{table_name}')").fetchall()
        cols = [r[1] for r in rows] if rows else []
        return column_name in cols
    except Exception:
        return False


def upgrade() -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name

    # Only add column if it does not exist
    if not _has_column(conn, 'inventory', 'kdv_rate'):
        if dialect == 'sqlite':
            # SQLite: batch alter table to add column
            with op.batch_alter_table('inventory') as batch_op:
                batch_op.add_column(sa.Column('kdv_rate', sa.Float(), nullable=True, server_default=text('18.0')))
        else:
            op.add_column('inventory', sa.Column('kdv_rate', sa.Float(), nullable=True, server_default=text('18.0')))

    # Backfill values for existing rows
    try:
        conn.exec_driver_sql("UPDATE inventory SET kdv_rate = 18.0 WHERE kdv_rate IS NULL")
    except Exception:
        pass


def downgrade() -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name

    if _has_column(conn, 'inventory', 'kdv_rate'):
        if dialect == 'sqlite':
            with op.batch_alter_table('inventory') as batch_op:
                batch_op.drop_column('kdv_rate')
        else:
            op.drop_column('inventory', 'kdv_rate')
