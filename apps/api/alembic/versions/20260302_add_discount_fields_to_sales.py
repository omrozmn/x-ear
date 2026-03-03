"""Add discount_type and discount_value to sales table

Revision ID: 20260302_discount_fields
Revises: add_kdv_to_sales
Create Date: 2026-03-02 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers
revision = '20260302_discount_fields'
down_revision = 'add_kdv_to_sales'
branch_labels = None
depends_on = None


def upgrade():
    """Add discount_type and discount_value columns with intelligent backfill"""
    
    # Add columns as nullable first
    op.add_column('sales', sa.Column(
        'discount_type',
        sa.String(20),
        nullable=True
    ))
    
    op.add_column('sales', sa.Column(
        'discount_value',
        sa.Numeric(12, 2),
        nullable=True
    ))
    
    # Also add unit_list_price for clarity (informational)
    op.add_column('sales', sa.Column(
        'unit_list_price',
        sa.Numeric(12, 2),
        nullable=True
    ))
    
    # Backfill Strategy 1: Copy from DeviceAssignment (most accurate)
    op.execute(text("""
        UPDATE sales s
        SET 
            discount_type = COALESCE(da.discount_type, 'none'),
            discount_value = COALESCE(da.discount_value, 0.0)
        FROM (
            SELECT DISTINCT ON (sale_id)
                sale_id,
                discount_type,
                discount_value
            FROM device_assignments
            WHERE sale_id IS NOT NULL
              AND discount_type IS NOT NULL
            ORDER BY sale_id, created_at DESC
        ) da
        WHERE s.id = da.sale_id
          AND s.discount_type IS NULL
    """))
    
    # Backfill Strategy 2: Calculate from existing data (NO GUESSING!)
    # For sales without device_assignments, calculate based on actual data
    # User Decision: C - Calculate if discount_amount/list_price_total is close to round percentage
    op.execute(text("""
        UPDATE sales
        SET 
            discount_type = CASE
                WHEN discount_amount = 0 OR discount_amount IS NULL THEN 'none'
                WHEN list_price_total > 0 AND discount_amount > 0 THEN
                    -- Calculate percentage ratio
                    CASE
                        -- If discount_amount is close to a round percentage (within 0.01%)
                        WHEN ABS((discount_amount / list_price_total * 100) - ROUND(discount_amount / list_price_total * 100)) < 0.01
                        THEN 'percentage'
                        ELSE 'amount'
                    END
                ELSE 'none'
            END,
            discount_value = CASE
                WHEN discount_amount = 0 OR discount_amount IS NULL THEN 0.0
                WHEN list_price_total > 0 AND discount_amount > 0 THEN
                    CASE
                        -- If percentage, store the percentage value
                        WHEN ABS((discount_amount / list_price_total * 100) - ROUND(discount_amount / list_price_total * 100)) < 0.01
                        THEN ROUND(discount_amount / list_price_total * 100, 2)
                        -- If amount, store the amount value
                        ELSE discount_amount
                    END
                ELSE 0.0
            END
        WHERE discount_type IS NULL
    """))
    
    # Backfill unit_list_price (same as list_price_total for now)
    op.execute(text("""
        UPDATE sales
        SET unit_list_price = list_price_total
        WHERE unit_list_price IS NULL
    """))
    
    # Set defaults for any remaining NULL values
    op.execute(text("""
        UPDATE sales
        SET discount_type = 'none'
        WHERE discount_type IS NULL
    """))
    
    op.execute(text("""
        UPDATE sales
        SET discount_value = 0.0
        WHERE discount_value IS NULL
    """))
    
    # Make columns non-nullable after backfill
    op.alter_column('sales', 'discount_type', nullable=False)
    op.alter_column('sales', 'discount_value', nullable=False)
    op.alter_column('sales', 'unit_list_price', nullable=False)


def downgrade():
    """Remove discount_type and discount_value columns"""
    op.drop_column('sales', 'unit_list_price')
    op.drop_column('sales', 'discount_value')
    op.drop_column('sales', 'discount_type')
