"""Add email deliverability tables

Revision ID: 20260124_deliverability
Revises: 678bca5f8a40
Create Date: 2025-01-24

This migration adds tables for email deliverability features:
- email_bounce: Track bounced emails and blacklist
- email_unsubscribe: Track unsubscribe preferences
- dmarc_report: Store DMARC aggregate reports
- email_complaint: Track spam complaints
- deliverability_metrics: Daily deliverability snapshots

Also adds new columns to email_logs table:
- spam_score: Spam filter score
- dkim_signed: Whether email was DKIM signed
- unsubscribe_token: Unique token for unsubscribe link
- is_promotional: Whether email is promotional (vs transactional)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260124_deliverability'
down_revision = '9e4d614c2186'
branch_labels = None
depends_on = None


def upgrade():
    # Only add new columns or tables not present in previous migrations
    op.add_column('email_logs', sa.Column('spam_score', sa.Integer, nullable=True))
    op.add_column('email_logs', sa.Column('dkim_signed', sa.Boolean, default=False, nullable=False))
    op.add_column('email_logs', sa.Column('unsubscribe_token', sa.String(64), nullable=True))
    op.add_column('email_logs', sa.Column('is_promotional', sa.Boolean, default=False, nullable=False))
    op.create_index('ix_email_logs_unsubscribe_token', 'email_logs', ['unsubscribe_token'])

    # Create email_bounce table
    op.create_table('email_bounce',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False),
        sa.Column('email_log_id', sa.String(50), nullable=True),
        sa.Column('recipient', sa.String(255), nullable=False),
        sa.Column('bounce_type', sa.String(20), nullable=False),
        sa.Column('bounce_reason', sa.Text, nullable=True),
        sa.Column('smtp_code', sa.Integer, nullable=True),
        sa.Column('bounce_count', sa.Integer, default=1, nullable=False),
        sa.Column('first_bounce_at', sa.DateTime, nullable=False),
        sa.Column('last_bounce_at', sa.DateTime, nullable=False),
        sa.Column('is_blacklisted', sa.Boolean, default=False, nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['email_log_id'], ['email_logs.id']),
    )
    op.create_index('ix_email_bounce_tenant_recipient', 'email_bounce', ['tenant_id', 'recipient'])
    op.create_index('ix_email_bounce_tenant_blacklisted', 'email_bounce', ['tenant_id', 'is_blacklisted'])
    op.create_index('ix_email_bounce_type', 'email_bounce', ['bounce_type'])

    # Create email_unsubscribe table
    op.create_table('email_unsubscribe',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False),
        sa.Column('recipient', sa.String(255), nullable=False),
        sa.Column('scenario', sa.String(100), nullable=False),
        sa.Column('unsubscribed_at', sa.DateTime, nullable=False),
        sa.Column('unsubscribe_token', sa.String(64), nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text, nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.UniqueConstraint('unsubscribe_token')
    )
    op.create_index('ix_email_unsubscribe_tenant_recipient_scenario', 'email_unsubscribe', ['tenant_id', 'recipient', 'scenario'], unique=True)
    op.create_index('ix_email_unsubscribe_token', 'email_unsubscribe', ['unsubscribe_token'])

    # Create dmarc_report table
    op.create_table('dmarc_report',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False),
        sa.Column('report_id', sa.String(255), nullable=False),
        sa.Column('org_name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('date_begin', sa.DateTime, nullable=False),
        sa.Column('date_end', sa.DateTime, nullable=False),
        sa.Column('domain', sa.String(255), nullable=False),
        sa.Column('policy_published', sa.Text, nullable=True),
        sa.Column('records', sa.Text, nullable=True),
        sa.Column('pass_count', sa.Integer, default=0),
        sa.Column('fail_count', sa.Integer, default=0),
        sa.Column('failure_rate', sa.Float, default=0.0),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
    )
    op.create_index('ix_dmarc_report_tenant_domain', 'dmarc_report', ['tenant_id', 'domain'])
    op.create_index('ix_dmarc_report_date_begin', 'dmarc_report', ['date_begin'])

    # Create email_complaint table
    op.create_table('email_complaint',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False),
        sa.Column('email_log_id', sa.String(50), nullable=True),
        sa.Column('recipient', sa.String(255), nullable=False),
        sa.Column('complaint_type', sa.String(50), nullable=False),
        sa.Column('feedback_loop_provider', sa.String(100), nullable=True),
        sa.Column('complained_at', sa.DateTime, nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['email_log_id'], ['email_logs.id']),
    )
    op.create_index('ix_email_complaint_tenant_recipient', 'email_complaint', ['tenant_id', 'recipient'])
    op.create_index('ix_email_complaint_type', 'email_complaint', ['complaint_type'])

    # Create deliverability_metrics table
    op.create_table('deliverability_metrics',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False),
        sa.Column('date', sa.Date, nullable=False),
        sa.Column('emails_sent', sa.Integer, default=0),
        sa.Column('emails_delivered', sa.Integer, default=0),
        sa.Column('emails_bounced', sa.Integer, default=0),
        sa.Column('emails_complained', sa.Integer, default=0),
        sa.Column('bounce_rate', sa.Float, default=0.0),
        sa.Column('complaint_rate', sa.Float, default=0.0),
        sa.Column('deliverability_rate', sa.Float, default=0.0),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
    )
    op.create_index('ix_deliverability_metrics_tenant_date', 'deliverability_metrics', ['tenant_id', 'date'], unique=True)


def downgrade():
    # Drop indexes on email_logs
    op.drop_index('ix_email_logs_unsubscribe_token', table_name='email_logs')
    
    # Drop columns from email_logs
    op.drop_column('email_logs', 'is_promotional')
    op.drop_column('email_logs', 'unsubscribe_token')
    op.drop_column('email_logs', 'dkim_signed')
    op.drop_column('email_logs', 'spam_score')
    
    # Drop deliverability_metrics table
    op.drop_index('ix_deliverability_metrics_tenant_date', table_name='deliverability_metrics')
    op.drop_table('deliverability_metrics')
    
    # Drop email_complaint table
    op.drop_index('ix_email_complaint_type', table_name='email_complaint')
    op.drop_index('ix_email_complaint_tenant_recipient', table_name='email_complaint')
    op.drop_table('email_complaint')
    
    # Drop dmarc_report table
    op.drop_index('ix_dmarc_report_date_begin', table_name='dmarc_report')
    op.drop_index('ix_dmarc_report_tenant_domain', table_name='dmarc_report')
    op.drop_table('dmarc_report')
    
    # Drop email_unsubscribe table
    op.drop_index('ix_email_unsubscribe_token', table_name='email_unsubscribe')
    op.drop_index('ix_email_unsubscribe_tenant_recipient_scenario', table_name='email_unsubscribe')
    op.drop_table('email_unsubscribe')
    
    # Drop email_bounce table
    op.drop_index('ix_email_bounce_type', table_name='email_bounce')
    op.drop_index('ix_email_bounce_tenant_blacklisted', table_name='email_bounce')
    op.drop_index('ix_email_bounce_tenant_recipient', table_name='email_bounce')
    op.drop_table('email_bounce')
