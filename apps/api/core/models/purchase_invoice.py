"""
Purchase Invoice Models
Handles incoming and outgoing invoices from/to suppliers via BirFatura integration
"""
from sqlalchemy import Column, Boolean, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text
from sqlalchemy.orm import relationship
from .base import BaseModel
from .mixins import TenantScopedMixin


class PurchaseInvoice(BaseModel, TenantScopedMixin):
    """
    Purchase Invoice model represents invoices from suppliers or return invoices to suppliers.
    Integrated with BirFatura e-Invoice system.
    """
    __tablename__ = 'purchase_invoices'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True)
    # tenant_id is now inherited from TenantScopedMixin
    branch_id = Column(String(50), ForeignKey('branches.id'), nullable=True, index=True)
    
    # BirFatura API information
    birfatura_uuid = Column(String(100), unique=True, nullable=False, index=True)
    invoice_number = Column(String(100), index=True)
    invoice_date = Column(DateTime, nullable=False, index=True)
    invoice_type = Column(String(50), default='INCOMING')  # 'INCOMING' or 'OUTGOING'
    
    # Sender information (Always populated)
    sender_name = Column(String(200), nullable=False)
    sender_tax_number = Column(String(50), nullable=False, index=True)
    sender_tax_office = Column(String(100))
    sender_address = Column(Text)
    sender_city = Column(String(100))
    sender_district = Column(String(100))

    # Supplier relationship (Nullable - may not exist initially)
    supplier_id = Column(Integer, ForeignKey('suppliers.id'), nullable=True, index=True)
    supplier = relationship('Supplier', backref='purchase_invoices')
    
    # Invoice summary
    currency = Column(String(10), default='TRY')
    subtotal = Column(Numeric(12, 2))  # Tax excluded
    tax_amount = Column(Numeric(12, 2))  # Tax amount
    total_amount = Column(Numeric(12, 2), nullable=False)  # Tax included total
    
    # BirFatura raw data (JSON)
    raw_data = Column(JSON)  # Original API response
    
    # Status
    status = Column(String(50), default='RECEIVED')  # RECEIVED, PROCESSED, PAID, etc.
    is_matched = Column(Boolean, default=False)  # Matched with supplier?

    # Link to Purchase record created from this invoice
    purchase_id = Column(String(50), nullable=True, index=True)

    # Notes
    notes = Column(Text)
    
    # Timestamps inherited from BaseModel
    
    def __repr__(self):
        return f'<PurchaseInvoice {self.invoice_number} from {self.sender_name}>'
    
    def to_dict(self):
        """Convert purchase invoice to dictionary"""
        return {
            'id': self.id,
            'branchId': self.branch_id,
            'birfaturaUuid': self.birfatura_uuid,
            'invoiceNumber': self.invoice_number,
            'invoiceDate': self.invoice_date.isoformat() if self.invoice_date else None,
            'invoiceType': self.invoice_type,
            'senderName': self.sender_name,
            'senderTaxNumber': self.sender_tax_number,
            'senderTaxOffice': self.sender_tax_office,
            'senderAddress': self.sender_address,
            'senderCity': self.sender_city,
            'supplierId': self.supplier_id,
            'currency': self.currency,
            'subtotal': float(self.subtotal) if self.subtotal else None,
            'taxAmount': float(self.tax_amount) if self.tax_amount else None,
            'totalAmount': float(self.total_amount) if self.total_amount else None,
            'status': self.status,
            'isMatched': self.is_matched,
            'notes': self.notes,
            'itemsCount': len(self.items) if hasattr(self, 'items') else 0,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }


class PurchaseInvoiceItem(BaseModel, TenantScopedMixin):
    """
    Purchase Invoice Item model represents line items in a purchase invoice.
    """
    __tablename__ = 'purchase_invoice_items'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True)
    purchase_invoice_id = Column(Integer, ForeignKey('purchase_invoices.id'), nullable=False, index=True)
    # tenant_id is now inherited from TenantScopedMixin
    branch_id = Column(String(50), ForeignKey('branches.id'), nullable=True, index=True)
    
    # Product information
    product_code = Column(String(100))  # Supplier's product code
    product_name = Column(String(200), nullable=False)
    product_description = Column(Text)
    
    # Quantity and price
    quantity = Column(Numeric(10, 2), nullable=False)
    unit = Column(String(50))  # 'Adet', 'Kg', 'Litre', etc.
    unit_price = Column(Numeric(10, 2), nullable=False)  # Tax excluded
    
    # Tax
    tax_rate = Column(Integer, default=20)  # Tax rate (%)
    tax_amount = Column(Numeric(10, 2))
    
    # Total (Tax included)
    line_total = Column(Numeric(12, 2), nullable=False)
    
    # Relationships
    purchase_invoice = relationship('PurchaseInvoice', backref='items')
    
    # Match with our inventory if exists
    inventory_id = Column(String(100), ForeignKey('inventory.id'), nullable=True)
    inventory = relationship('InventoryItem')
    
    def __repr__(self):
        return f'<PurchaseInvoiceItem {self.product_name} x {self.quantity}>'
    
    def to_dict(self):
        """Convert item to dictionary"""
        return {
            'id': self.id,
            'branchId': self.branch_id,
            'purchaseInvoiceId': self.purchase_invoice_id,
            'productCode': self.product_code,
            'productName': self.product_name,
            'productDescription': self.product_description,
            'quantity': float(self.quantity) if self.quantity else None,
            'unit': self.unit,
            'unitPrice': float(self.unit_price) if self.unit_price else None,
            'taxRate': self.tax_rate,
            'taxAmount': float(self.tax_amount) if self.tax_amount else None,
            'lineTotal': float(self.line_total) if self.line_total else None,
            'inventoryId': self.inventory_id,
        }


class SuggestedSupplier(BaseModel, TenantScopedMixin):
    """
    Suggested Supplier model represents potential suppliers identified from incoming invoices
    that don't match existing suppliers in the system.
    """
    __tablename__ = 'suggested_suppliers'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True)
    # tenant_id is now inherited from TenantScopedMixin
    branch_id = Column(String(50), ForeignKey('branches.id'), nullable=True, index=True)
    
    # Basic information (extracted from invoices)
    company_name = Column(String(200), nullable=False)
    tax_number = Column(String(50), unique=True, nullable=False, index=True)
    tax_office = Column(String(100))
    address = Column(Text)
    city = Column(String(100))
    
    # Statistics
    invoice_count = Column(Integer, default=1)  # Number of invoices received
    total_amount = Column(Numeric(12, 2), default=0)  # Total invoice amount
    first_invoice_date = Column(DateTime)
    last_invoice_date = Column(DateTime)
    
    # Status
    status = Column(String(50), default='PENDING')  # PENDING, ACCEPTED, REJECTED
    accepted_at = Column(DateTime, nullable=True)
    accepted_by = Column(String(100), nullable=True)  # User info (for future)
    
    # If accepted, reference to created supplier
    supplier_id = Column(Integer, ForeignKey('suppliers.id'), nullable=True)
    supplier = relationship('Supplier')
    
    # Timestamps inherited from BaseModel
    
    def __repr__(self):
        return f'<SuggestedSupplier {self.company_name} ({self.tax_number})>'
    
    def to_dict(self):
        """Convert suggested supplier to dictionary"""
        return {
            'id': self.id,
            'branchId': self.branch_id,
            'companyName': self.company_name,
            'taxNumber': self.tax_number,
            'taxOffice': self.tax_office,
            'address': self.address,
            'city': self.city,
            'invoiceCount': self.invoice_count,
            'totalAmount': float(self.total_amount) if self.total_amount else 0,
            'firstInvoiceDate': self.first_invoice_date.isoformat() if self.first_invoice_date else None,
            'lastInvoiceDate': self.last_invoice_date.isoformat() if self.last_invoice_date else None,
            'status': self.status,
            'acceptedAt': self.accepted_at.isoformat() if self.accepted_at else None,
            'acceptedBy': self.accepted_by,
            'supplierId': self.supplier_id,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }
