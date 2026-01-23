"""Extend activity_logs table for two-level activity logging system

Revision ID: 20251203_extend_activity
Revises: 61f444e581bf
Create Date: 2025-12-03

Adds:
- tenant_id: For multi-tenant filtering
- branch_id: For branch-level filtering  
- real_user_id: For impersonation tracking
- role: User's role at action time
- message: Human-readable action description
- data: Structured JSON data
- is_critical: Critical action flag
- Composite indexes for performance
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20251203_extend_activity'
down_revision = '61f444e581bf'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to activity_logs table
    # Use batch mode for SQLite compatibility
    with op.batch_alter_table('activity_logs', schema=None) as batch_op:
        # Multi-tenant support
        batch_op.add_column(sa.Column('tenant_id', sa.String(36), nullable=True))
        batch_op.add_column(sa.Column('branch_id', sa.String(50), nullable=True))
        
        # User tracking enhancements
        batch_op.add_column(sa.Column('real_user_id', sa.String(50), nullable=True))
        batch_op.add_column(sa.Column('role', sa.String(50), nullable=True))
        
        # Action details
        batch_op.add_column(sa.Column('message', sa.String(500), nullable=True))
        batch_op.add_column(sa.Column('data', sa.Text, nullable=True))
        batch_op.add_column(sa.Column('is_critical', sa.Boolean, default=False))
        
        # Make user_id nullable for system actions
        batch_op.alter_column('user_id', nullable=True)
        
        # Make action column larger
        batch_op.alter_column('action', type_=sa.String(100))
        
        # Make entity_type nullable (can be derived from action)
        batch_op.alter_column('entity_type', nullable=True)
    
    # Create indexes for common query patterns
    # Main tenant + created_at index for performance
    op.create_index('ix_activity_tenant_created', 'activity_logs', ['tenant_id', 'created_at'])
    
    # Action index for filtering by action type
    op.create_index('ix_activity_action', 'activity_logs', ['action'])
    
    # Tenant + action index
    op.create_index('ix_activity_tenant_action', 'activity_logs', ['tenant_id', 'action'])
    
    # Critical flag index
    op.create_index('ix_activity_critical', 'activity_logs', ['is_critical'])
    
    # Foreign key constraints (if supported by database)
    # These may fail on SQLite, so we use try/except
    try:
        op.create_foreign_key(
            'fk_activity_logs_tenant',
            'activity_logs', 'tenants',
            ['tenant_id'], ['id']
        )
        op.create_foreign_key(
            'fk_activity_logs_branch',
            'activity_logs', 'branches',
            ['branch_id'], ['id']
        )
    except Exception:
        # SQLite doesn't support adding FK constraints to existing tables
        pass


def downgrade():
    # Remove indexes
    op.drop_index('ix_activity_tenant_created', table_name='activity_logs')
    op.drop_index('ix_activity_action', table_name='activity_logs')
    op.drop_index('ix_activity_tenant_action', table_name='activity_logs')
    op.drop_index('ix_activity_critical', table_name='activity_logs')
    
    # Try to remove foreign keys
    try:
        op.drop_constraint('fk_activity_logs_tenant', 'activity_logs', type_='foreignkey')
        op.drop_constraint('fk_activity_logs_branch', 'activity_logs', type_='foreignkey')
    except Exception:
        pass
    
    # Remove columns
    with op.batch_alter_table('activity_logs', schema=None) as batch_op:
        batch_op.drop_column('is_critical')
        batch_op.drop_column('data')
        batch_op.drop_column('message')
        batch_op.drop_column('role')
        batch_op.drop_column('real_user_id')
        batch_op.drop_column('branch_id')
        batch_op.drop_column('tenant_id')
        
        # Revert column changes
        batch_op.alter_column('user_id', nullable=False)
        batch_op.alter_column('action', type_=sa.String(50))
        batch_op.alter_column('entity_type', nullable=False)
