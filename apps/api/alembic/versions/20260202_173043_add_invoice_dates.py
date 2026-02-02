"""add invoice issue_date and due_date

Revision ID: 20260202_173043
Revises: 
Create Date: 2026-02-02 17:30:43

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260202_173043'
down_revision = 'dac79898a376'  # Latest migration
branch_labels = None
depends_on = None


def upgrade():
    # Add issue_date and due_date columns to invoices table
    op.add_column('invoices', sa.Column('issue_date', sa.DateTime(), nullable=True))
    op.add_column('invoices', sa.Column('due_date', sa.DateTime(), nullable=True))
    
    # Create index on issue_date for better query performance
    op.create_index(op.f('ix_invoices_issue_date'), 'invoices', ['issue_date'], unique=False)


def downgrade():
    # Drop index and columns
    op.drop_index(op.f('ix_invoices_issue_date'), table_name='invoices')
    op.drop_column('invoices', 'due_date')
    op.drop_column('invoices', 'issue_date')
