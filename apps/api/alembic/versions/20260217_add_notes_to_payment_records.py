"""add notes to payment_records

Revision ID: 20260217_add_notes
Revises: 20260202_173043_add_invoice_dates
Create Date: 2026-02-17 15:55:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260217_add_notes'
down_revision = '20260202_173043'
branch_labels = None
depends_on = None


def upgrade():
    # Add notes column to payment_records table
    op.add_column('payment_records', sa.Column('notes', sa.Text(), nullable=True))


def downgrade():
    # Remove notes column from payment_records table
    op.drop_column('payment_records', 'notes')
