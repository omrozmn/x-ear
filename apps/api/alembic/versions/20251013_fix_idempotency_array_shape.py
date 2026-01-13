"""
Repair existing idempotency rows that contain array-shaped response_json and
normalize them as part of a migration. This migration is idempotent and safe to
run multiple times in CI or production. It will only touch rows where
`response_json` begins with '[' indicating an array-shaped JSON payload.

Revision ID: 20251013_fix_idempotency_array_shape
Revises: 20251011_add_idempotency_table
Create Date: 2025-10-13 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column
from sqlalchemy import String, Integer, Text
import json

# revision identifiers, used by Alembic.
revision = '20251013_fix_idempotency_array_shape'
down_revision = '20251011_add_idempotency_table'
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    # Select candidate rows where response_json starts with '['
    result = connection.execute(sa.text("SELECT id, response_json FROM idempotency_keys WHERE response_json LIKE '[%';"))
    rows = result.fetchall()
    repaired = 0
    for row in rows:
        row_id = row[0]
        raw = row[1]
        try:
            parsed = json.loads(raw)
        except Exception:
            continue
        if isinstance(parsed, list) and len(parsed) >= 2 and isinstance(parsed[-1], int):
            corrected_payload = parsed[0]
            corrected_status = int(parsed[-1])
            # Update the row with canonical shape
            connection.execute(sa.text(
                "UPDATE idempotency_keys SET response_json = :rj, status_code = :sc WHERE id = :id"
            ), { 'rj': json.dumps(corrected_payload), 'sc': corrected_status, 'id': row_id })
            repaired += 1
    if repaired:
        print(f"Alembic migration: repaired {repaired} idempotency rows with array-shaped response_json")


def downgrade():
    # Nothing to do for downgrade
    pass
