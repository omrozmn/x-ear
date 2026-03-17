"""add_noah_import_tables

Revision ID: noah_import_001
Revises: make_brand_nullable
Create Date: 2026-03-11 21:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'noah_import_001'
down_revision: Union[str, None] = 'make_brand_nullable'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Agent Devices (must be created first — referenced by sessions)
    op.create_table(
        'noah_agent_devices',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('branch_id', sa.String(50), sa.ForeignKey('branches.id'), nullable=True),
        sa.Column('device_name', sa.String(255), nullable=True),
        sa.Column('device_fingerprint', sa.String(255), nullable=False, unique=True),
        sa.Column('agent_version', sa.String(20), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('device_token_hash', sa.String(128), nullable=True),
        sa.Column('token_expires_at', sa.DateTime, nullable=True),
        sa.Column('enrollment_token_hash', sa.String(128), nullable=True),
        sa.Column('export_folder', sa.String(500), server_default=r'C:\XEAR\noah_exports'),
        sa.Column('last_seen_at', sa.DateTime, nullable=True),
        sa.Column('last_heartbeat_ip', sa.String(45), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('ix_noah_device_status', 'noah_agent_devices', ['status'])

    # Import Sessions
    op.create_table(
        'noah_import_sessions',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('branch_id', sa.String(50), sa.ForeignKey('branches.id'), nullable=True),
        sa.Column('requesting_user_id', sa.String(50), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('device_id', sa.String(50), sa.ForeignKey('noah_agent_devices.id'), nullable=True),
        sa.Column('status', sa.String(30), nullable=False, server_default='pending'),
        sa.Column('allowed_formats', sa.JSON, nullable=True),
        sa.Column('progress_stage', sa.String(50), nullable=True),
        sa.Column('progress_percent', sa.Integer, server_default='0'),
        sa.Column('records_created', sa.Integer, server_default='0'),
        sa.Column('records_updated', sa.Integer, server_default='0'),
        sa.Column('records_skipped', sa.Integer, server_default='0'),
        sa.Column('duplicates_found', sa.Integer, server_default='0'),
        sa.Column('errors', sa.JSON, nullable=True),
        sa.Column('file_name', sa.String(255), nullable=True),
        sa.Column('file_size', sa.Integer, nullable=True),
        sa.Column('file_sha256', sa.String(64), nullable=True),
        sa.Column('file_exported_at', sa.DateTime, nullable=True),
        sa.Column('parser_name', sa.String(50), nullable=True),
        sa.Column('parser_version', sa.String(20), nullable=True),
        sa.Column('expires_at', sa.DateTime, nullable=False),
        sa.Column('completed_at', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('ix_noah_session_status', 'noah_import_sessions', ['status'])
    op.create_index('ix_noah_session_device', 'noah_import_sessions', ['device_id'])

    # Audit Logs
    op.create_table(
        'noah_import_audit_logs',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('session_id', sa.String(50), sa.ForeignKey('noah_import_sessions.id'), nullable=False),
        sa.Column('device_id', sa.String(50), nullable=True),
        sa.Column('user_id', sa.String(50), nullable=True),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('detail', sa.JSON, nullable=True),
        sa.Column('file_sha256', sa.String(64), nullable=True),
        sa.Column('parser_version', sa.String(20), nullable=True),
        sa.Column('records_created', sa.Integer, server_default='0'),
        sa.Column('records_updated', sa.Integer, server_default='0'),
        sa.Column('outcome', sa.String(20), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('ix_noah_audit_session', 'noah_import_audit_logs', ['session_id'])

    # Possible Duplicates
    op.create_table(
        'noah_possible_duplicates',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('session_id', sa.String(50), sa.ForeignKey('noah_import_sessions.id'), nullable=False),
        sa.Column('imported_data', sa.JSON, nullable=False),
        sa.Column('existing_party_id', sa.String(50), sa.ForeignKey('parties.id'), nullable=True),
        sa.Column('match_score', sa.Integer, server_default='0'),
        sa.Column('match_reason', sa.String(255), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('resolved_by', sa.String(50), nullable=True),
        sa.Column('resolved_at', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('ix_noah_dup_session', 'noah_possible_duplicates', ['session_id'])
    op.create_index('ix_noah_dup_status', 'noah_possible_duplicates', ['status'])


def downgrade() -> None:
    op.drop_table('noah_possible_duplicates')
    op.drop_table('noah_import_audit_logs')
    op.drop_table('noah_import_sessions')
    op.drop_table('noah_agent_devices')
