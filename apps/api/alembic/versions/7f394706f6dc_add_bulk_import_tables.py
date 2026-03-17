"""Add bulk import tables

Revision ID: 7f394706f6dc
Revises: 1cc8cbfc8370
Create Date: 2026-03-03 11:15:42.341288

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7f394706f6dc'
down_revision: Union[str, None] = '1cc8cbfc8370'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('bulk_import_batches',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('tenant_id', sa.String(length=36), nullable=False),
    sa.Column('tool_id', sa.String(length=100), nullable=False),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('file_name', sa.String(length=255), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_bulk_import_batches_tenant_id'), 'bulk_import_batches', ['tenant_id'], unique=False)
    
    op.create_table('bulk_import_records',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('tenant_id', sa.String(length=36), nullable=False),
    sa.Column('batch_id', sa.String(length=36), nullable=False),
    sa.Column('entity_id', sa.String(length=36), nullable=False),
    sa.Column('entity_type', sa.String(length=100), nullable=True),
    sa.Column('is_rolled_back', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['batch_id'], ['bulk_import_batches.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_bulk_import_records_batch_id'), 'bulk_import_records', ['batch_id'], unique=False)
    op.create_index(op.f('ix_bulk_import_records_tenant_id'), 'bulk_import_records', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_bulk_import_records_entity_id'), 'bulk_import_records', ['entity_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_bulk_import_records_entity_id'), table_name='bulk_import_records')
    op.drop_index(op.f('ix_bulk_import_records_batch_id'), table_name='bulk_import_records')
    op.drop_table('bulk_import_records')
    
    op.drop_index(op.f('ix_bulk_import_batches_tenant_id'), table_name='bulk_import_batches')
    op.drop_table('bulk_import_batches')
