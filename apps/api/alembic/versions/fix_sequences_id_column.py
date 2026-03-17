"""fix sequences id column to string

Revision ID: fix_sequences_id
Revises: ef70430aa16e
Create Date: 2026-02-21 14:50:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'fix_sequences_id'
down_revision: Union[str, None] = '72e97fccf37c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # This migration converts sequences.id from integer to string.
    # On fresh DBs, ef70430aa16e (parallel branch) may have already created
    # sequences with string id and uq_sequence_key constraint, so we check first.
    from sqlalchemy import inspect as sa_inspect
    conn = op.get_bind()
    inspector = sa_inspect(conn)

    if 'sequences' not in inspector.get_table_names():
        # sequences doesn't exist at all (shouldn't happen, but be safe)
        return

    # Check if id column is already a string type (already migrated)
    columns = {c['name']: c for c in inspector.get_columns('sequences')}
    id_col = columns.get('id')
    if id_col and str(id_col['type']).upper().startswith('VARCHAR'):
        # Already has string id - nothing to do
        return

    # Need to migrate: create temp table, copy data, swap
    op.create_table('sequences_new',
        sa.Column('id', sa.String(50), nullable=False),
        sa.Column('tenant_id', sa.String(36), nullable=False),
        sa.Column('seq_type', sa.String(50), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('prefix', sa.String(20), nullable=False),
        sa.Column('last_number', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'seq_type', 'year', 'prefix', name='uq_sequence_key_new')
    )
    op.create_index(op.f('ix_sequences_new_tenant_id'), 'sequences_new', ['tenant_id'], unique=False)

    # Copy data from old table
    op.execute("""
        INSERT INTO sequences_new (id, tenant_id, seq_type, year, prefix, last_number, created_at, updated_at)
        SELECT CAST(id AS TEXT), tenant_id, seq_type, year, prefix, last_number, created_at, updated_at
        FROM sequences
    """)

    # Drop old table and rename
    op.execute('DROP TABLE sequences CASCADE')
    op.rename_table('sequences_new', 'sequences')


def downgrade() -> None:
    # Reverse the process
    op.create_table('sequences_old',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('tenant_id', sa.String(36), nullable=False),
        sa.Column('seq_type', sa.String(50), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('prefix', sa.String(20), nullable=False),
        sa.Column('last_number', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'seq_type', 'year', 'prefix', name='uq_sequence_key')
    )
    op.create_index(op.f('ix_sequences_old_tenant_id'), 'sequences_old', ['tenant_id'], unique=False)
    
    op.execute("""
        INSERT INTO sequences_old (tenant_id, seq_type, year, prefix, last_number, created_at, updated_at)
        SELECT tenant_id, seq_type, year, prefix, last_number, created_at, updated_at
        FROM sequences
    """)
    
    op.drop_index(op.f('ix_sequences_new_tenant_id'), table_name='sequences')
    op.drop_table('sequences')
    
    op.rename_table('sequences_old', 'sequences')
