"""Add email approval table for AI email workflow

Revision ID: 20260124_email_approval
Revises: 20260124_deliverability
Create Date: 2025-01-24

This migration adds the email_approval table for AI email approval workflow.
HIGH and CRITICAL risk emails require manual approval before sending.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260124_email_approval'
down_revision = '20260124_deliverability'
branch_labels = None
depends_on = None


def upgrade():
    # Create email_approval table
    op.create_table(
        'email_approval',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id'), nullable=False, index=True),
        sa.Column('email_log_id', sa.String(50), sa.ForeignKey('email_logs.id'), nullable=True),
        sa.Column('recipient', sa.String(255), nullable=False),
        sa.Column('subject', sa.String(500), nullable=False),
        sa.Column('body_text', sa.Text, nullable=False),
        sa.Column('body_html', sa.Text, nullable=True),
        sa.Column('scenario', sa.String(100), nullable=False),
        sa.Column('risk_level', sa.String(20), nullable=False),  # LOW, MEDIUM, HIGH, CRITICAL
        sa.Column('risk_reasons', sa.Text, nullable=True),  # JSON array of risk reasons
        sa.Column('spam_score', sa.Float, nullable=True),
        sa.Column('status', sa.String(20), default='pending', nullable=False),  # pending, approved, rejected
        sa.Column('action_plan_hash', sa.String(64), nullable=True),  # For AI-generated emails
        sa.Column('requested_at', sa.DateTime, nullable=False),
        sa.Column('reviewed_at', sa.DateTime, nullable=True),
        sa.Column('reviewed_by', sa.String(36), nullable=True),  # User ID
        sa.Column('review_notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )
    
    # Indexes for email_approval
    op.create_index('ix_email_approval_tenant_status', 'email_approval', ['tenant_id', 'status'])
    op.create_index('ix_email_approval_risk_level', 'email_approval', ['risk_level'])
    op.create_index('ix_email_approval_action_plan_hash', 'email_approval', ['action_plan_hash'])
    op.create_index('ix_email_approval_requested_at', 'email_approval', ['requested_at'])


def downgrade():
    # Drop indexes
    op.drop_index('ix_email_approval_requested_at', table_name='email_approval')
    op.drop_index('ix_email_approval_action_plan_hash', table_name='email_approval')
    op.drop_index('ix_email_approval_risk_level', table_name='email_approval')
    op.drop_index('ix_email_approval_tenant_status', table_name='email_approval')
    
    # Drop table
    op.drop_table('email_approval')
