"""add sales owner user column to sales

Revision ID: 20260316_sales_owner
Revises: 894e4a02bb88
Create Date: 2026-03-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = '20260316_sales_owner'
down_revision: Union[str, None] = '894e4a02bb88'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_columns = {col['name'] for col in inspector.get_columns('sales')}

    with op.batch_alter_table('sales') as batch_op:
        if 'sales_owner_user_id' not in existing_columns:
            batch_op.add_column(sa.Column('sales_owner_user_id', sa.String(length=50), nullable=True))
            batch_op.create_index('ix_sales_sales_owner_user_id', ['sales_owner_user_id'], unique=False)
            batch_op.create_foreign_key('fk_sales_sales_owner_user_id_users', 'users', ['sales_owner_user_id'], ['id'])

    # -----------------------------------------------------------
    # Backfill existing sales with their original creator.
    # Pass 1: activity_logs (most reliable source)
    # -----------------------------------------------------------
    op.execute(
        sa.text(
            """
            UPDATE sales
            SET sales_owner_user_id = activity_source.user_id
            FROM (
                SELECT entity_id AS sale_id, user_id
                FROM activity_logs
                WHERE entity_type = 'sale'
                  AND action = 'sale_created'
                  AND user_id IS NOT NULL
            ) AS activity_source
            WHERE sales.id = activity_source.sale_id
              AND sales.sales_owner_user_id IS NULL
            """
        )
    )

    # -----------------------------------------------------------
    # Log how many sales remain without an owner after backfill
    # (Sale model has no created_by column, so activity_logs is
    #  the only backfill source available.)
    # -----------------------------------------------------------
    conn = op.get_bind()
    remaining = conn.execute(
        sa.text("SELECT COUNT(*) FROM sales WHERE sales_owner_user_id IS NULL")
    ).scalar()
    if remaining:
        import logging
        logging.getLogger("alembic.runtime.migration").warning(
            "Backfill complete — %d sales still have NULL sales_owner_user_id", remaining
        )


def downgrade() -> None:
    with op.batch_alter_table('sales') as batch_op:
        batch_op.drop_constraint('fk_sales_sales_owner_user_id_users', type_='foreignkey')
        batch_op.drop_index('ix_sales_sales_owner_user_id')
        batch_op.drop_column('sales_owner_user_id')
