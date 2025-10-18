"""
Fix money fields in invoices and proformas: Float -> Numeric(12,2)

Revision ID: 20251215_fix_invoice_money_fields
Revises: 20251011_fix_invoices_device_id_type
Create Date: 2025-12-15 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '20251215_fix_invoice_money_fields'
down_revision = '20251011_fix_invoices_device_id_type'
branch_labels = None
depends_on = None


def upgrade():
    """Convert Float money fields to Numeric(12,2) for precision"""
    conn = op.get_bind()
    dialect = conn.dialect.name

    def _has_column(connection, table_name, column_name):
        """Return True when a column exists in the given table (SQLite friendly)."""
        try:
            if dialect == 'sqlite':
                rows = connection.exec_driver_sql(f"PRAGMA table_info('{table_name}')").fetchall()
                cols = [r[1] for r in rows] if rows else []
                return column_name in cols
            else:
                # PostgreSQL/MySQL
                result = connection.exec_driver_sql(f"""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = '{table_name}' AND column_name = '{column_name}'
                """).fetchone()
                return result is not None
        except Exception:
            return False

    # Fix invoices.device_price
    if _has_column(conn, 'invoices', 'device_price'):
        if dialect == 'sqlite':
            # SQLite: use batch alter with temp column
            with op.batch_alter_table('invoices') as batch_op:
                batch_op.add_column(sa.Column('device_price_tmp', sa.Numeric(12, 2), nullable=True))
            
            # Copy data with precision conversion
            try:
                conn.exec_driver_sql("""
                    UPDATE invoices 
                    SET device_price_tmp = ROUND(CAST(device_price AS DECIMAL), 2)
                    WHERE device_price IS NOT NULL
                """)
            except Exception:
                # Fallback: direct copy
                conn.exec_driver_sql("""
                    UPDATE invoices 
                    SET device_price_tmp = device_price
                """)
            
            with op.batch_alter_table('invoices') as batch_op:
                batch_op.drop_column('device_price')
                batch_op.alter_column('device_price_tmp', new_column_name='device_price')
                
        elif dialect == 'postgresql':
            # PostgreSQL: direct alter with USING clause
            op.alter_column('invoices', 'device_price', 
                          type_=sa.Numeric(12, 2), 
                          postgresql_using="ROUND(device_price::numeric, 2)",
                          existing_type=sa.Float())
        else:
            # MySQL/other: temp column approach
            with op.batch_alter_table('invoices') as batch_op:
                batch_op.add_column(sa.Column('device_price_tmp', sa.Numeric(12, 2), nullable=True))
            
            conn.exec_driver_sql("""
                UPDATE invoices 
                SET device_price_tmp = ROUND(device_price, 2)
                WHERE device_price IS NOT NULL
            """)
            
            with op.batch_alter_table('invoices') as batch_op:
                batch_op.drop_column('device_price')
                batch_op.alter_column('device_price_tmp', new_column_name='device_price')

    # Fix proformas.device_price
    if _has_column(conn, 'proformas', 'device_price'):
        if dialect == 'sqlite':
            with op.batch_alter_table('proformas') as batch_op:
                batch_op.add_column(sa.Column('device_price_tmp', sa.Numeric(12, 2), nullable=True))
            
            try:
                conn.exec_driver_sql("""
                    UPDATE proformas 
                    SET device_price_tmp = ROUND(CAST(device_price AS DECIMAL), 2)
                    WHERE device_price IS NOT NULL
                """)
            except Exception:
                conn.exec_driver_sql("""
                    UPDATE proformas 
                    SET device_price_tmp = device_price
                """)
            
            with op.batch_alter_table('proformas') as batch_op:
                batch_op.drop_column('device_price')
                batch_op.alter_column('device_price_tmp', new_column_name='device_price')
                
        elif dialect == 'postgresql':
            op.alter_column('proformas', 'device_price', 
                          type_=sa.Numeric(12, 2), 
                          postgresql_using="ROUND(device_price::numeric, 2)",
                          existing_type=sa.Float())
        else:
            with op.batch_alter_table('proformas') as batch_op:
                batch_op.add_column(sa.Column('device_price_tmp', sa.Numeric(12, 2), nullable=True))
            
            conn.exec_driver_sql("""
                UPDATE proformas 
                SET device_price_tmp = ROUND(device_price, 2)
                WHERE device_price IS NOT NULL
            """)
            
            with op.batch_alter_table('proformas') as batch_op:
                batch_op.drop_column('device_price')
                batch_op.alter_column('device_price_tmp', new_column_name='device_price')


def downgrade():
    """Revert Numeric(12,2) money fields back to Float"""
    conn = op.get_bind()
    dialect = conn.dialect.name

    # Revert invoices.device_price
    if dialect == 'sqlite':
        with op.batch_alter_table('invoices') as batch_op:
            batch_op.add_column(sa.Column('device_price_tmp', sa.Float(), nullable=True))
        
        conn.exec_driver_sql("""
            UPDATE invoices 
            SET device_price_tmp = CAST(device_price AS REAL)
            WHERE device_price IS NOT NULL
        """)
        
        with op.batch_alter_table('invoices') as batch_op:
            batch_op.drop_column('device_price')
            batch_op.alter_column('device_price_tmp', new_column_name='device_price')
            
    elif dialect == 'postgresql':
        op.alter_column('invoices', 'device_price', 
                      type_=sa.Float(), 
                      postgresql_using="device_price::float",
                      existing_type=sa.Numeric(12, 2))
    else:
        with op.batch_alter_table('invoices') as batch_op:
            batch_op.add_column(sa.Column('device_price_tmp', sa.Float(), nullable=True))
        
        conn.exec_driver_sql("""
            UPDATE invoices 
            SET device_price_tmp = CAST(device_price AS DECIMAL)
        """)
        
        with op.batch_alter_table('invoices') as batch_op:
            batch_op.drop_column('device_price')
            batch_op.alter_column('device_price_tmp', new_column_name='device_price')

    # Revert proformas.device_price
    if dialect == 'sqlite':
        with op.batch_alter_table('proformas') as batch_op:
            batch_op.add_column(sa.Column('device_price_tmp', sa.Float(), nullable=True))
        
        conn.exec_driver_sql("""
            UPDATE proformas 
            SET device_price_tmp = CAST(device_price AS REAL)
            WHERE device_price IS NOT NULL
        """)
        
        with op.batch_alter_table('proformas') as batch_op:
            batch_op.drop_column('device_price')
            batch_op.alter_column('device_price_tmp', new_column_name='device_price')
            
    elif dialect == 'postgresql':
        op.alter_column('proformas', 'device_price', 
                      type_=sa.Float(), 
                      postgresql_using="device_price::float",
                      existing_type=sa.Numeric(12, 2))
    else:
        with op.batch_alter_table('proformas') as batch_op:
            batch_op.add_column(sa.Column('device_price_tmp', sa.Float(), nullable=True))
        
        conn.exec_driver_sql("""
            UPDATE proformas 
            SET device_price_tmp = CAST(device_price AS DECIMAL)
        """)
        
        with op.batch_alter_table('proformas') as batch_op:
            batch_op.drop_column('device_price')
            batch_op.alter_column('device_price_tmp', new_column_name='device_price')