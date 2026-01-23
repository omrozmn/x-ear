"""Add email system tables for SMTP integration

Revision ID: 20260125_add_email_system_tables
Revises: 20260123_create_ai_tables
Create Date: 2026-01-25 10:00:00.000000

This migration creates the database schema for the SMTP Email Integration feature:
- tenant_smtp_config: Tenant-specific SMTP configurations with encrypted passwords
- email_log: Audit trail of all email sending attempts
- email_template: Email templates with Jinja2 syntax (Phase 2 - admin-editable)

Requirements: 1.4, 5.1, 5.2, 20.1, 20.2, 20.3, 20.5
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260125_add_email_system_tables'
down_revision = '187e494f427a'
branch_labels = None
depends_on = None


def upgrade():
    """Create email system tables with proper indexes and foreign keys."""
    
    # Create tenant_smtp_config table
    op.create_table(
        'tenant_smtp_config',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('host', sa.String(255), nullable=False),
        sa.Column('port', sa.Integer, nullable=False),
        sa.Column('username', sa.String(255), nullable=False),
        sa.Column('encrypted_password', sa.Text, nullable=False),
        sa.Column('from_email', sa.String(255), nullable=False),
        sa.Column('from_name', sa.String(255), nullable=False),
        sa.Column('use_tls', sa.Boolean, default=False),
        sa.Column('use_ssl', sa.Boolean, default=True),
        sa.Column('timeout', sa.Integer, default=30),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    # Create indexes for tenant_smtp_config
    op.create_index('ix_tenant_smtp_config_tenant_id', 'tenant_smtp_config', ['tenant_id'])
    op.create_index('ix_tenant_smtp_config_is_active', 'tenant_smtp_config', ['is_active'])
    op.create_index('ix_tenant_smtp_config_tenant_active', 'tenant_smtp_config', ['tenant_id', 'is_active'])
    
    # Create email_log table
    op.create_table(
        'email_log',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('recipient', sa.String(255), nullable=False),
        sa.Column('subject', sa.String(500), nullable=False),
        sa.Column('body_preview', sa.Text, nullable=True),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('retry_count', sa.Integer, default=0),
        sa.Column('template_name', sa.String(100), nullable=True),
        sa.Column('scenario', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )
    
    # Create indexes for email_log
    op.create_index('ix_email_log_tenant_id', 'email_log', ['tenant_id'])
    op.create_index('ix_email_log_recipient', 'email_log', ['recipient'])
    op.create_index('ix_email_log_status', 'email_log', ['status'])
    op.create_index('ix_email_log_sent_at', 'email_log', ['sent_at'])
    op.create_index('ix_email_log_tenant_status_sent', 'email_log', ['tenant_id', 'status', 'sent_at'])
    
    # Create email_template table
    op.create_table(
        'email_template',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('language_code', sa.String(5), nullable=False),
        sa.Column('subject_template', sa.String(500), nullable=False),
        sa.Column('html_template', sa.Text, nullable=False),
        sa.Column('text_template', sa.Text, nullable=False),
        sa.Column('variables_schema', sa.JSON, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.UniqueConstraint('name', 'language_code', name='uq_email_template_name_lang')
    )
    
    # Create indexes for email_template
    op.create_index('ix_email_template_name', 'email_template', ['name'])
    op.create_index('ix_email_template_language_code', 'email_template', ['language_code'])


def downgrade():
    """Drop email system tables."""
    op.drop_table('email_template')
    op.drop_table('email_log')
    op.drop_table('tenant_smtp_config')
