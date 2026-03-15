"""add whatsapp messages table

Revision ID: 20260312_180500
Revises: 20260306_154345
Create Date: 2026-03-12 18:05:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260312_180500"
down_revision = "20260306_154345"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "whatsapp_messages" not in existing_tables:
        op.create_table(
            "whatsapp_messages",
            sa.Column("id", sa.String(length=50), nullable=False),
            sa.Column("party_id", sa.String(length=50), nullable=True),
            sa.Column("direction", sa.String(length=10), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False),
            sa.Column("chat_id", sa.String(length=255), nullable=False),
            sa.Column("chat_title", sa.String(length=255), nullable=True),
            sa.Column("phone_number", sa.String(length=32), nullable=True),
            sa.Column("message_text", sa.Text(), nullable=False),
            sa.Column("external_message_id", sa.String(length=255), nullable=True),
            sa.Column("tenant_id", sa.String(length=50), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["party_id"], ["parties.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    existing_indexes = {index["name"] for index in inspector.get_indexes("whatsapp_messages")} if "whatsapp_messages" in inspector.get_table_names() else set()
    if "ix_whatsapp_messages_tenant_chat" not in existing_indexes:
        op.create_index("ix_whatsapp_messages_tenant_chat", "whatsapp_messages", ["tenant_id", "chat_id"])
    if "ix_whatsapp_messages_created" not in existing_indexes:
        op.create_index("ix_whatsapp_messages_created", "whatsapp_messages", ["created_at"])


def downgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())
    if "whatsapp_messages" not in existing_tables:
        return
    existing_indexes = {index["name"] for index in inspector.get_indexes("whatsapp_messages")}
    if "ix_whatsapp_messages_created" in existing_indexes:
        op.drop_index("ix_whatsapp_messages_created", table_name="whatsapp_messages")
    if "ix_whatsapp_messages_tenant_chat" in existing_indexes:
        op.drop_index("ix_whatsapp_messages_tenant_chat", table_name="whatsapp_messages")
    op.drop_table("whatsapp_messages")
