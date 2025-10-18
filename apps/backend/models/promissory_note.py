# Promissory Note Model
from .base import db, BaseModel, gen_id
import sqlalchemy as sa

class PromissoryNote(BaseModel):
    """Promissory Note (Senet) model for tracking promissory notes"""
    __tablename__ = "promissory_notes"
    
    # Primary key
    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id("note"))
    
    # Foreign keys
    patient_id = db.Column(db.String(50), db.ForeignKey('patients.id'), nullable=False)
    sale_id = db.Column(db.String(50), db.ForeignKey('sales.id'))  # Optional: link to sale
    
    # Note details
    note_number = db.Column(db.Integer, nullable=False)  # Note number in series (1, 2, 3...)
    total_notes = db.Column(db.Integer, nullable=False)  # Total number of notes in series
    
    # Financial details
    amount = db.Column(sa.Numeric(12, 2), nullable=False)  # Amount of this specific note
    paid_amount = db.Column(sa.Numeric(12, 2), default=0.0)  # Amount paid so far (for partial payments)
    total_amount = db.Column(sa.Numeric(12, 2), nullable=False)  # Total amount of all notes
    
    # Dates
    issue_date = db.Column(db.DateTime, nullable=False)  # Date note was created
    due_date = db.Column(db.DateTime, nullable=False)  # When payment is due
    
    # Status
    status = db.Column(db.String(20), default='active')  # active, paid, partial, overdue, cancelled
    paid_date = db.Column(db.DateTime)  # When note was fully paid
    
    # Debtor information
    debtor_name = db.Column(db.String(200), nullable=False)
    debtor_tc = db.Column(db.String(11))
    debtor_address = db.Column(db.Text)
    debtor_tax_office = db.Column(db.String(100))
    debtor_phone = db.Column(db.String(20))
    
    # Guarantor information (optional)
    has_guarantor = db.Column(db.Boolean, default=False)
    guarantor_name = db.Column(db.String(200))
    guarantor_tc = db.Column(db.String(11))
    guarantor_address = db.Column(db.Text)
    guarantor_phone = db.Column(db.String(20))
    
    # Legal details
    authorized_court = db.Column(db.String(200), default='İstanbul (Çağlayan)')
    
    # Document reference
    document_id = db.Column(db.String(50))  # Reference to stored document
    file_name = db.Column(db.String(255))  # Original file name
    
    # Additional info
    notes = db.Column(db.Text)
    
    def to_dict(self):
        base_dict = self.to_dict_base()
        note_dict = {
            'id': self.id,
            'patientId': self.patient_id,
            'saleId': self.sale_id,
            'noteNumber': self.note_number,
            'totalNotes': self.total_notes,
            'amount': float(self.amount) if self.amount else None,
            'paidAmount': float(self.paid_amount) if self.paid_amount else 0.0,
            'totalAmount': float(self.total_amount) if self.total_amount else None,
            'issueDate': self.issue_date.isoformat() if self.issue_date else None,
            'dueDate': self.due_date.isoformat() if self.due_date else None,
            'status': self.status,
            'paidDate': self.paid_date.isoformat() if self.paid_date else None,
            'debtorName': self.debtor_name,
            'debtorTc': self.debtor_tc,
            'debtorAddress': self.debtor_address,
            'debtorTaxOffice': self.debtor_tax_office,
            'debtorPhone': self.debtor_phone,
            'hasGuarantor': self.has_guarantor,
            'guarantorName': self.guarantor_name,
            'guarantorTc': self.guarantor_tc,
            'guarantorAddress': self.guarantor_address,
            'guarantorPhone': self.guarantor_phone,
            'authorizedCourt': self.authorized_court,
            'documentId': self.document_id,
            'fileName': self.file_name,
            'notes': self.notes
        }
        note_dict.update(base_dict)
        return note_dict
    
    # Indexes for performance
    __table_args__ = (
        db.Index('ix_promissory_note_patient', 'patient_id'),
        db.Index('ix_promissory_note_sale', 'sale_id'),
        db.Index('ix_promissory_note_status', 'status'),
        db.Index('ix_promissory_note_due_date', 'due_date'),
    )
