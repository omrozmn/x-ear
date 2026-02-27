# Promissory Note Model
from sqlalchemy import Column, Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, Time, Index
from core.models.base import Base
from .base import db, BaseModel, gen_id
from .mixins import TenantScopedMixin
import sqlalchemy as sa

class PromissoryNote(BaseModel, TenantScopedMixin):
    """Promissory Note (Senet) model for tracking promissory notes"""
    __tablename__ = "promissory_notes"
    
    # Primary key
    id = Column(String(50), primary_key=True, default=lambda: gen_id("note"))
    
    # Foreign keys
    party_id = Column(String(50), ForeignKey('parties.id'), nullable=False)
    sale_id = Column(String(50), ForeignKey('sales.id'))  # Optional: link to sale
    # tenant_id is now inherited from TenantScopedMixin
    
    # Note details
    note_number = Column(Integer, nullable=False)  # Note number in series (1, 2, 3...)
    total_notes = Column(Integer, nullable=False)  # Total number of notes in series
    
    # Financial details
    amount = Column(sa.Numeric(12, 2), nullable=False)  # Amount of this specific note
    paid_amount = Column(sa.Numeric(12, 2), default=0.0)  # Amount paid so far (for partial payments)
    total_amount = Column(sa.Numeric(12, 2), nullable=False)  # Total amount of all notes
    
    # Dates
    issue_date = Column(DateTime, nullable=False)  # Date note was created
    due_date = Column(DateTime, nullable=False)  # When payment is due
    
    # Status
    status = Column(String(20), default='active')  # active, paid, partial, overdue, cancelled
    paid_date = Column(DateTime)  # When note was fully paid
    
    # Debtor information
    debtor_name = Column(String(200), nullable=False)
    debtor_tc = Column(String(11))
    debtor_address = Column(Text)
    debtor_tax_office = Column(String(100))
    debtor_phone = Column(String(20))
    
    # Guarantor information (optional)
    has_guarantor = Column(Boolean, default=False)
    guarantor_name = Column(String(200))
    guarantor_tc = Column(String(11))
    guarantor_address = Column(Text)
    guarantor_phone = Column(String(20))
    
    # Legal details
    authorized_court = Column(String(200), default='İstanbul (Çağlayan)')
    
    # Document reference
    document_id = Column(String(50))  # Reference to stored document
    file_name = Column(String(255))  # Original file name
    
    # Additional info
    notes = Column(Text)
    
    def to_dict(self):
        base_dict = self.to_dict_base()
        note_dict = {
            'id': self.id,
            'partyId': self.party_id,
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
        Index('ix_promissory_note_patient', 'party_id'),
        Index('ix_promissory_note_sale', 'sale_id'),
        Index('ix_promissory_note_status', 'status'),
        Index('ix_promissory_note_due_date', 'due_date'),
    )
