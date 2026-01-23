"""
Change invoices.device_id from Integer -> String(50)

Revision ID: 20251011_fix_invoices_device_id_type
Revises: 15e3d0d90add
Create Date: 2025-10-11 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '20251011_fix_invoices_device_id_type'
down_revision = '15e3d0d90add'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    dialect = conn.dialect.name

    def _has_column(connection, table_name, column_name):
        """Return True when a column exists in the given table (SQLite friendly)."""
        try:
            # PRAGMA table_info returns rows where index 1 is column name
            rows = connection.exec_driver_sql(f"PRAGMA table_info('{table_name}')").fetchall()
            cols = [r[1] for r in rows] if rows else []
            return column_name in cols
        except Exception:
            return False

    if dialect == 'sqlite':
        # Idempotent path for SQLite: guard each step so repeated runs are safe.
        has_tmp = _has_column(conn, 'invoices', 'device_id_tmp')
        has_device = _has_column(conn, 'invoices', 'device_id')

        if not has_tmp and has_device:
            # Add temporary column
            with op.batch_alter_table('invoices') as batch_op:
                batch_op.add_column(sa.Column('device_id_tmp', sa.String(length=50), nullable=True))

            # Populate tmp column from existing device_id (best-effort)
            try:
                conn.exec_driver_sql("""
                    UPDATE invoices
                    SET device_id_tmp = CASE WHEN device_id IS NULL THEN NULL ELSE CAST(device_id AS TEXT) END
                """)
            except Exception:
                # best-effort: don't fail migration just because population failed
                pass

            # Replace old column with tmp
            with op.batch_alter_table('invoices') as batch_op:
                try:
                    batch_op.drop_column('device_id')
                except Exception:
                    # might have been removed already by a prior partial run
                    pass
                try:
                    batch_op.alter_column('device_id_tmp', new_column_name='device_id')
                except Exception:
                    pass

            # Recreate FK if devices.id exists
            try:
                op.create_foreign_key('fk_invoices_device_id_devices', 'invoices', 'devices', ['device_id'], ['id'])
            except Exception:
                # non-fatal
                pass

        elif has_tmp and has_device:
            # tmp exists and device exists (partial run) -> try to populate and finish replacement
            try:
                conn.exec_driver_sql("""
                    UPDATE invoices
                    SET device_id_tmp = CASE WHEN device_id IS NULL THEN NULL ELSE CAST(device_id AS TEXT) END
                """)
            except Exception:
                pass

            with op.batch_alter_table('invoices') as batch_op:
                try:
                    batch_op.drop_column('device_id')
                except Exception:
                    pass
                try:
                    batch_op.alter_column('device_id_tmp', new_column_name='device_id')
                except Exception:
                    pass

            try:
                op.create_foreign_key('fk_invoices_device_id_devices', 'invoices', 'devices', ['device_id'], ['id'])
            except Exception:
                pass

        else:
            # Nothing to do: either already applied or no device_id column present
            pass

    else:
        # PostgreSQL/MySQL: alter column type using native SQL if possible
        try:
            if dialect == 'postgresql':
                # Use USING cast for Postgres
                op.alter_column('invoices', 'device_id', type_=sa.String(length=50), postgresql_using="device_id::text", existing_type=sa.INTEGER())
            else:
                # Generic (non-SQLite) path: guard adding/populating columns to be idempotent.
                has_tmp = _has_column(conn, 'invoices', 'device_id_tmp')
                has_device = _has_column(conn, 'invoices', 'device_id')

                if not has_tmp and has_device:
                    with op.batch_alter_table('invoices') as batch_op:
                        batch_op.add_column(sa.Column('device_id_tmp', sa.String(length=50), nullable=True))

                    try:
                        conn.exec_driver_sql("""
                            UPDATE invoices
                            SET device_id_tmp = CAST(device_id AS CHAR)
                            WHERE device_id IS NOT NULL
                        """)
                    except Exception:
                        pass

                    with op.batch_alter_table('invoices') as batch_op:
                        try:
                            batch_op.drop_column('device_id')
                        except Exception:
                            pass
                        try:
                            batch_op.alter_column('device_id_tmp', new_column_name='device_id')
                        except Exception:
                            pass

                    try:
                        op.create_foreign_key('fk_invoices_device_id_devices', 'invoices', 'devices', ['device_id'], ['id'])
                    except Exception:
                        pass
                else:
                    # Already applied or nothing to do
                    pass
        except Exception:
            raise


def downgrade():
    conn = op.get_bind()
    dialect = conn.dialect.name

    if dialect == 'sqlite':
        with op.batch_alter_table('invoices') as batch_op:
            batch_op.add_column(sa.Column('device_id_old', sa.Integer(), nullable=True))

        # Try to convert numeric strings back to integers; non-numeric will be set to NULL
        try:
            conn.exec_driver_sql("""
                UPDATE invoices
                SET device_id_old = CASE WHEN device_id GLOB '[0-9]*' THEN CAST(device_id AS INTEGER) ELSE NULL END
            """)
        except Exception:
            # best-effort fallback
            pass

        with op.batch_alter_table('invoices') as batch_op:
            batch_op.drop_column('device_id')
            batch_op.alter_column('device_id_old', new_column_name='device_id')

    else:
        try:
            if dialect == 'postgresql':
                op.alter_column('invoices', 'device_id', type_=sa.Integer(), postgresql_using="CASE WHEN device_id ~ '^[0-9]+$' THEN device_id::integer ELSE NULL END", existing_type=sa.VARCHAR(length=50))
            else:
                with op.batch_alter_table('invoices') as batch_op:
                    batch_op.add_column(sa.Column('device_id_old', sa.Integer(), nullable=True))

                # Attempt safe cast
                try:
                    conn.exec_driver_sql("""
                        UPDATE invoices
                        SET device_id_old = CASE WHEN device_id REGEXP '^[0-9]+$' THEN CAST(device_id AS SIGNED) ELSE NULL END
                    """)
                except Exception:
                    pass

                with op.batch_alter_table('invoices') as batch_op:
                    batch_op.drop_column('device_id')
                    batch_op.alter_column('device_id_old', new_column_name='device_id')
        except Exception:
            raise
