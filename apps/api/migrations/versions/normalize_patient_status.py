"""Normalize patient status values to lowercase

Revision ID: normalize_patient_status
Revises: 
Create Date: 2026-01-06

This migration ensures all patient status values are lowercase
to match the PatientStatus enum values (active, inactive, lead, trial, customer)
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'normalize_patient_status'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    """Normalize patient status to lowercase"""
    # Update all uppercase status values to lowercase
    op.execute("""
        UPDATE patients 
        SET status = LOWER(status) 
        WHERE status IS NOT NULL AND status != LOWER(status)
    """)

def downgrade():
    """No downgrade needed - lowercase is the standard"""
    pass
