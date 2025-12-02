"""Add e-document fields to invoices table

This migration adds fields needed for Birfatura/GİB integration:
- edocument_status: draft, pending, approved, rejected, cancelled
- edocument_type: EFATURA, EARSIV, EIRSALIYE, EMM, ESMM
- ettn: UUID from GİB
- profile_id: TEMELFATURA, TICARIFATURA, EARSIVFATURA
- invoice_type_code: SATIS, IADE, TEVKIFAT, SGK, ISTISNA
- qr_code_data: QR code data from GİB
- birfatura_response: JSON response from Birfatura
- gib_pdf_data: PDF from GİB (base64)
- gib_xml_data: XML from GİB (base64)
- birfatura_sent_at: When sent to Birfatura
- birfatura_approved_at: When approved by GİB
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = 'add_invoice_edocument_fields'
down_revision = 'add_purchase_invoices'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to invoices table
    with op.batch_alter_table('invoices', schema=None) as batch_op:
        batch_op.add_column(sa.Column('edocument_status', sa.String(20), nullable=True, default='draft'))
        batch_op.add_column(sa.Column('edocument_type', sa.String(20), nullable=True))
        batch_op.add_column(sa.Column('ettn', sa.String(100), nullable=True))
        batch_op.add_column(sa.Column('profile_id', sa.String(50), nullable=True))
        batch_op.add_column(sa.Column('invoice_type_code', sa.String(20), nullable=True))
        batch_op.add_column(sa.Column('qr_code_data', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('birfatura_response', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('gib_pdf_data', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('gib_xml_data', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('birfatura_sent_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('birfatura_approved_at', sa.DateTime(), nullable=True))
        
        # Create index on ettn for fast lookups
        batch_op.create_index('ix_invoices_ettn', ['ettn'], unique=True)
        batch_op.create_index('ix_invoices_edocument_status', ['edocument_status'], unique=False)


def downgrade():
    with op.batch_alter_table('invoices', schema=None) as batch_op:
        batch_op.drop_index('ix_invoices_edocument_status')
        batch_op.drop_index('ix_invoices_ettn')
        batch_op.drop_column('birfatura_approved_at')
        batch_op.drop_column('birfatura_sent_at')
        batch_op.drop_column('gib_xml_data')
        batch_op.drop_column('gib_pdf_data')
        batch_op.drop_column('birfatura_response')
        batch_op.drop_column('qr_code_data')
        batch_op.drop_column('invoice_type_code')
        batch_op.drop_column('profile_id')
        batch_op.drop_column('ettn')
        batch_op.drop_column('edocument_type')
        batch_op.drop_column('edocument_status')
