"""create_ai_requests_table

Revision ID: 343c8749d419
Revises: fix_sequences_id
Create Date: 2026-02-21 18:48:03.336178

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '343c8749d419'
down_revision: Union[str, None] = 'fix_sequences_id'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create ai_requests table
    op.create_table(
        'ai_requests',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('tenant_id', sa.String(length=50), nullable=False),
        sa.Column('user_id', sa.String(length=50), nullable=False),
        sa.Column('session_id', sa.String(length=50), nullable=True),
        sa.Column('prompt_encrypted', sa.Text(), nullable=False),
        sa.Column('prompt_hash', sa.String(length=64), nullable=False),
        sa.Column('prompt_redacted', sa.Text(), nullable=True),
        sa.Column('intent_type', sa.String(length=50), nullable=True),
        sa.Column('intent_confidence', sa.Integer(), nullable=True),
        sa.Column('intent_data', sa.JSON(), nullable=True),
        sa.Column('model_id', sa.String(length=100), nullable=True),
        sa.Column('model_version', sa.String(length=50), nullable=True),
        sa.Column('prompt_template_id', sa.String(length=50), nullable=True),
        sa.Column('prompt_template_hash', sa.String(length=64), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('tokens_input', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('tokens_output', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('latency_ms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('legal_hold', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('idempotency_key', sa.String(length=100), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_ai_requests_tenant_id', 'tenant_id'),
        sa.Index('ix_ai_requests_user_id', 'user_id'),
        sa.Index('ix_ai_requests_session_id', 'session_id'),
        sa.Index('ix_ai_requests_created_at', 'created_at'),
        sa.Index('ix_ai_requests_idempotency_key', 'idempotency_key'),
    )


def downgrade() -> None:
    op.drop_table('ai_requests')
