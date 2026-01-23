"""add_missing_email_tables

Revision ID: 4d73710bea06
Revises: 9e4d614c2186
Create Date: 2026-01-25 23:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4d73710bea06'
down_revision: Union[str, None] = '9e4d614c2186'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create tenant_smtp_config table
    op.create_table('tenant_smtp_config',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('tenant_id', sa.String(length=36), nullable=False),
    sa.Column('host', sa.String(length=255), nullable=False),
    sa.Column('port', sa.Integer(), nullable=False),
    sa.Column('username', sa.String(length=255), nullable=False),
    sa.Column('encrypted_password', sa.Text(), nullable=False),
    sa.Column('from_email', sa.String(length=255), nullable=False),
    sa.Column('from_name', sa.String(length=255), nullable=False),
    sa.Column('use_tls', sa.Boolean(), nullable=True),
    sa.Column('use_ssl', sa.Boolean(), nullable=True),
    sa.Column('timeout', sa.Integer(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tenant_smtp_config_is_active'), 'tenant_smtp_config', ['is_active'], unique=False)
    op.create_index(op.f('ix_tenant_smtp_config_tenant_id'), 'tenant_smtp_config', ['tenant_id'], unique=False)
    op.create_index('ix_tenant_smtp_config_tenant_active', 'tenant_smtp_config', ['tenant_id', 'is_active'], unique=False)
    
    # Create smtp_email_log table
    op.create_table('smtp_email_log',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('tenant_id', sa.String(length=36), nullable=False),
    sa.Column('recipient', sa.String(length=255), nullable=False),
    sa.Column('subject', sa.String(length=500), nullable=False),
    sa.Column('body_preview', sa.Text(), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('error_message', sa.Text(), nullable=True),
    sa.Column('retry_count', sa.Integer(), nullable=True),
    sa.Column('template_name', sa.String(length=100), nullable=True),
    sa.Column('scenario', sa.String(length=100), nullable=True),
    sa.Column('idempotency_key', sa.String(length=128), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_smtp_email_log_idempotency_key'), 'smtp_email_log', ['idempotency_key'], unique=False)
    op.create_index(op.f('ix_smtp_email_log_recipient'), 'smtp_email_log', ['recipient'], unique=False)
    op.create_index(op.f('ix_smtp_email_log_sent_at'), 'smtp_email_log', ['sent_at'], unique=False)
    op.create_index(op.f('ix_smtp_email_log_status'), 'smtp_email_log', ['status'], unique=False)
    op.create_index(op.f('ix_smtp_email_log_tenant_id'), 'smtp_email_log', ['tenant_id'], unique=False)
    op.create_index('ix_smtp_email_log_tenant_idempotency', 'smtp_email_log', ['tenant_id', 'idempotency_key'], unique=False)
    op.create_index('ix_smtp_email_log_tenant_status_sent', 'smtp_email_log', ['tenant_id', 'status', 'sent_at'], unique=False)
    
    # Create email_template table
    op.create_table('email_template',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('language_code', sa.String(length=5), nullable=False),
    sa.Column('subject_template', sa.String(length=500), nullable=False),
    sa.Column('html_template', sa.Text(), nullable=False),
    sa.Column('text_template', sa.Text(), nullable=False),
    sa.Column('variables_schema', sa.JSON(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name', 'language_code', name='uq_email_template_name_lang')
    )
    op.create_index(op.f('ix_email_template_language_code'), 'email_template', ['language_code'], unique=False)
    op.create_index(op.f('ix_email_template_name'), 'email_template', ['name'], unique=False)
    op.create_index('ix_email_template_name_lang', 'email_template', ['name', 'language_code'], unique=True)


def downgrade() -> None:
    op.drop_table('email_template')
    op.drop_table('smtp_email_log')
    op.drop_table('tenant_smtp_config')
