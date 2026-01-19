"""Create AI Layer tables

Revision ID: create_ai_layer_tables
Revises: add_is_default_sms
Create Date: 2026-01-13 15:00:00.000000

This migration creates the AI Layer database tables:
- ai_requests: Stores AI requests with encrypted prompts
- ai_actions: Stores action plans with risk analysis
- ai_audit_logs: Comprehensive audit logging (append-only)
- ai_usage: Usage tracking with atomic increment support

Requirements: 1.4, 6.7, 9.1, 9.2, 10.1, 26.2, 29.1
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'create_ai_layer_tables'
down_revision = 'add_is_default_sms'
branch_labels = None
depends_on = None


def upgrade():
    # =========================================================================
    # AI Requests Table
    # =========================================================================
    op.create_table(
        'ai_requests',
        sa.Column('id', sa.String(64), primary_key=True),
        
        # Tenant and user context
        sa.Column('tenant_id', sa.String(64), nullable=False, index=True),
        sa.Column('user_id', sa.String(64), nullable=False, index=True),
        sa.Column('session_id', sa.String(64), nullable=True, index=True),
        
        # Request content (encrypted and redacted)
        sa.Column('prompt_encrypted', sa.Text(), nullable=False),
        sa.Column('prompt_hash', sa.String(64), nullable=False, index=True),
        sa.Column('prompt_redacted', sa.Text(), nullable=True),
        
        # Intent classification
        sa.Column('intent_type', sa.String(32), nullable=True),
        sa.Column('intent_confidence', sa.Integer(), nullable=True),
        sa.Column('intent_data', postgresql.JSONB(), nullable=True),
        
        # Model tracking
        sa.Column('model_id', sa.String(64), nullable=True),
        sa.Column('model_version', sa.String(32), nullable=True),
        sa.Column('prompt_template_id', sa.String(64), nullable=True),
        sa.Column('prompt_template_hash', sa.String(64), nullable=True),
        
        # Status tracking
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('error_message', sa.Text(), nullable=True),
        
        # Usage metrics
        sa.Column('tokens_input', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('tokens_output', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('latency_ms', sa.Integer(), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        
        # Idempotency
        sa.Column('idempotency_key', sa.String(128), nullable=True, index=True),
    )
    
    # Composite indexes for ai_requests
    op.create_index('ix_ai_requests_tenant_created', 'ai_requests', ['tenant_id', 'created_at'])
    op.create_index('ix_ai_requests_user_created', 'ai_requests', ['user_id', 'created_at'])
    op.create_index('ix_ai_requests_status_created', 'ai_requests', ['status', 'created_at'])
    
    # =========================================================================
    # AI Actions Table
    # =========================================================================
    op.create_table(
        'ai_actions',
        sa.Column('id', sa.String(64), primary_key=True),
        
        # References
        sa.Column('request_id', sa.String(64), sa.ForeignKey('ai_requests.id'), nullable=False, index=True),
        sa.Column('tenant_id', sa.String(64), nullable=False, index=True),
        sa.Column('user_id', sa.String(64), nullable=False, index=True),
        
        # Action plan
        sa.Column('action_plan', postgresql.JSONB(), nullable=False),
        sa.Column('action_plan_hash', sa.String(64), nullable=False, index=True),
        sa.Column('tool_schema_versions', postgresql.JSONB(), nullable=False, server_default='{}'),
        
        # Risk assessment
        sa.Column('risk_level', sa.String(16), nullable=False, server_default='low'),
        sa.Column('risk_reasoning', sa.Text(), nullable=True),
        sa.Column('required_permissions', postgresql.JSONB(), nullable=True, server_default='[]'),
        
        # Rollback
        sa.Column('rollback_plan', postgresql.JSONB(), nullable=True),
        
        # Status
        sa.Column('status', sa.String(20), nullable=False, server_default='draft'),
        
        # Approval tracking
        sa.Column('approval_token_hash', sa.String(64), nullable=True),
        sa.Column('approval_expires_at', sa.DateTime(), nullable=True),
        sa.Column('approved_by', sa.String(64), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        
        # Execution tracking
        sa.Column('execution_started_at', sa.DateTime(), nullable=True),
        sa.Column('execution_completed_at', sa.DateTime(), nullable=True),
        sa.Column('execution_result', postgresql.JSONB(), nullable=True),
        sa.Column('execution_error', sa.Text(), nullable=True),
        
        # Dry-run/simulation
        sa.Column('dry_run_result', postgresql.JSONB(), nullable=True),
        
        # Idempotency
        sa.Column('idempotency_key', sa.String(128), nullable=True, index=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Composite indexes for ai_actions
    op.create_index('ix_ai_actions_tenant_status', 'ai_actions', ['tenant_id', 'status'])
    op.create_index('ix_ai_actions_tenant_created', 'ai_actions', ['tenant_id', 'created_at'])
    op.create_index('ix_ai_actions_approval_pending', 'ai_actions', ['status', 'approval_expires_at'])
    
    # =========================================================================
    # AI Audit Logs Table (Append-Only)
    # =========================================================================
    op.create_table(
        'ai_audit_logs',
        sa.Column('id', sa.String(64), primary_key=True),
        
        # Context
        sa.Column('tenant_id', sa.String(64), nullable=False, index=True),
        sa.Column('user_id', sa.String(64), nullable=False, index=True),
        sa.Column('request_id', sa.String(64), nullable=True, index=True),
        sa.Column('action_id', sa.String(64), nullable=True, index=True),
        sa.Column('session_id', sa.String(64), nullable=True),
        
        # Event details
        sa.Column('event_type', sa.String(32), nullable=False, index=True),
        sa.Column('event_timestamp', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        
        # AI context
        sa.Column('intent_type', sa.String(32), nullable=True),
        sa.Column('intent_confidence', sa.Integer(), nullable=True),
        sa.Column('action_plan_hash', sa.String(64), nullable=True),
        sa.Column('risk_level', sa.String(16), nullable=True),
        sa.Column('outcome', sa.String(32), nullable=True),
        
        # Model tracking
        sa.Column('model_id', sa.String(64), nullable=True),
        sa.Column('model_version', sa.String(32), nullable=True),
        sa.Column('prompt_template_id', sa.String(64), nullable=True),
        sa.Column('prompt_template_version', sa.String(32), nullable=True),
        sa.Column('prompt_template_hash', sa.String(64), nullable=True),
        
        # Policy tracking
        sa.Column('policy_version', sa.String(32), nullable=True),
        sa.Column('policy_rule_id', sa.String(64), nullable=True),
        sa.Column('policy_decision', sa.String(16), nullable=True),
        
        # Data changes (redacted)
        sa.Column('diff_snapshot', postgresql.JSONB(), nullable=True),
        
        # Error tracking
        sa.Column('error_code', sa.String(32), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        
        # Incident tracking
        sa.Column('incident_tag', sa.String(32), nullable=True, server_default='none'),
        sa.Column('incident_bundle_id', sa.String(64), nullable=True, index=True),
        
        # Extra context
        sa.Column('extra_data', postgresql.JSONB(), nullable=True, server_default='{}'),
        
        # Timestamps (immutable - no updated_at)
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    
    # Composite indexes for ai_audit_logs
    op.create_index('ix_ai_audit_logs_tenant_timestamp', 'ai_audit_logs', ['tenant_id', 'event_timestamp'])
    op.create_index('ix_ai_audit_logs_event_type_timestamp', 'ai_audit_logs', ['event_type', 'event_timestamp'])
    op.create_index('ix_ai_audit_logs_incident_tag', 'ai_audit_logs', ['incident_tag', 'event_timestamp'])
    op.create_index('ix_ai_audit_logs_request_timestamp', 'ai_audit_logs', ['request_id', 'event_timestamp'])
    
    # =========================================================================
    # AI Usage Table
    # =========================================================================
    op.create_table(
        'ai_usage',
        sa.Column('id', sa.String(64), primary_key=True),
        
        # Tracking dimensions
        sa.Column('tenant_id', sa.String(64), nullable=False),
        sa.Column('usage_date', sa.Date(), nullable=False),
        sa.Column('usage_type', sa.String(20), nullable=False),
        
        # Usage counters
        sa.Column('request_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('token_count_input', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('token_count_output', sa.Integer(), nullable=False, server_default='0'),
        
        # Quota tracking
        sa.Column('quota_limit', sa.Integer(), nullable=True),
        sa.Column('quota_exceeded_at', sa.DateTime(), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        
        # Unique constraint for upsert
        sa.UniqueConstraint('tenant_id', 'usage_date', 'usage_type', name='uix_ai_usage_tenant_date_type'),
    )
    
    # Index for ai_usage
    op.create_index('ix_ai_usage_tenant_date', 'ai_usage', ['tenant_id', 'usage_date'])


def downgrade():
    # Drop tables in reverse order (respecting foreign keys)
    op.drop_table('ai_usage')
    op.drop_table('ai_audit_logs')
    op.drop_table('ai_actions')
    op.drop_table('ai_requests')
