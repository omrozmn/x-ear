"""
Purchase Model
Represents approved purchase records created from invoices or manually.
"""
from sqlalchemy import Column, String, DateTime, Numeric, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from .base import BaseModel
from .mixins import TenantScopedMixin
from core.database import gen_id


class Purchase(BaseModel, TenantScopedMixin):
    """
    Purchase model represents approved purchase records.
    Can be created from PurchaseInvoice conversion or manually.
    """
    __tablename__ = 'purchases'
    __table_args__ = {'extend_existing': True}
    
    # Primary key with auto-generated default
    id = Column(String(50), primary_key=True, default=lambda: gen_id("purch"))
    
    # Basic purchase information
    supplier_id = Column(String(50), ForeignKey('suppliers.id'), nullable=False, index=True)
    purchase_date = Column(DateTime, nullable=False, index=True)
    
    # Financial information
    total_amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(10), default='TRY')
    
    # Status tracking
    status = Column(String(50), default='approved')  # approved, paid, cancelled
    
    # Source tracking
    invoice_id = Column(String(50), nullable=True, index=True)  # Removed ForeignKey to avoid circular dependency
    created_from_invoice = Column(Boolean, default=False)
    
    # User tracking
    created_by = Column(String(50), nullable=True)  # User ID who created this purchase
    approved_by = Column(String(50), nullable=True)  # User ID who approved (if different)
    approved_at = Column(DateTime, nullable=True)
    
    # Additional information
    notes = Column(Text, nullable=True)
    reference_number = Column(String(100), nullable=True)  # Internal reference
    
    # Relationships
    supplier = relationship('Supplier', backref='purchases')
    
    def __repr__(self):
        return f'<Purchase {self.id} from {self.supplier.name if self.supplier else "Unknown"}>'
    
    def to_dict(self):
        """Convert purchase to dictionary"""
        return {
            'id': self.id,
            'tenantId': self.tenant_id,
            'supplierId': self.supplier_id,
            'supplierName': self.supplier.name if self.supplier else None,
            'purchaseDate': self.purchase_date.isoformat() if self.purchase_date else None,
            'totalAmount': float(self.total_amount) if self.total_amount else 0,
            'currency': self.currency,
            'status': self.status,
            'invoiceId': self.invoice_id,
            'createdFromInvoice': self.created_from_invoice,
            'createdBy': self.created_by,
            'approvedBy': self.approved_by,
            'approvedAt': self.approved_at.isoformat() if self.approved_at else None,
            'notes': self.notes,
            'referenceNumber': self.reference_number,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }