"""
Suppliers and Product-Supplier Relationship Models
"""
from sqlalchemy import Column, Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from .base import db, BaseModel
from .mixins import TenantScopedMixin


class Supplier(BaseModel, TenantScopedMixin):
    """
    Supplier model represents companies that supply products to the business.
    """
    __tablename__ = 'suppliers'
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True)
    # tenant_id is now inherited from TenantScopedMixin
    
    # Company Information
    company_name = Column(String(200), nullable=False, unique=True, index=True)
    
    @property
    def name(self):
        return self.company_name
        
    company_code = Column(String(50), unique=True, index=True)  # Optional internal code
    tax_number = Column(String(50))
    tax_office = Column(String(100))
    institution_number = Column(String(50), index=True)
    
    # Contact Information
    contact_person = Column(String(100))
    email = Column(String(120), index=True)
    phone = Column(String(20))
    mobile = Column(String(20))
    fax = Column(String(20))
    website = Column(String(200))
    
    # Address
    address = Column(Text)
    city = Column(String(100))
    district = Column(String(100))
    country = Column(String(100), default='Türkiye')
    postal_code = Column(String(20))
    
    # Payment Terms
    payment_terms = Column(String(100))  # e.g., "Net 30", "Net 60", "COD"
    currency = Column(String(10), default='TRY')
    
    # Rating & Notes
    rating = Column(Integer)  # 1-5 stars
    notes = Column(Text)
    
    # Status
    is_active = Column(Boolean, default=True, index=True)
    
    # Timestamps inherited from BaseModel
    
    # Relationships
    products = relationship('ProductSupplier', back_populates='supplier', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Supplier {self.company_name}>'
    
    def to_dict(self):
        """Convert supplier to dictionary"""
        return {
            'id': self.id,
            'tenantId': self.tenant_id,
            'companyName': self.company_name,
            'companyCode': self.company_code,
            'taxNumber': self.tax_number,
            'taxOffice': self.tax_office,
            'institutionNumber': self.institution_number,
            'contactPerson': self.contact_person,
            'email': self.email,
            'phone': self.phone,
            'mobile': self.mobile,
            'fax': self.fax,
            'website': self.website,
            'address': self.address,
            'city': self.city,
            'country': self.country,
            'postalCode': self.postal_code,
            'paymentTerms': self.payment_terms,
            'currency': self.currency,
            'rating': self.rating,
            'notes': self.notes,
            'isActive': self.is_active,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            'productCount': len(self.products) if self.products else 0
        }


class ProductSupplier(BaseModel, TenantScopedMixin):
    """
    Product-Supplier Relationship Model
    Many-to-many relationship with additional fields
    """
    __tablename__ = 'product_suppliers'
    
    id = Column(Integer, primary_key=True)
    # tenant_id is now inherited from TenantScopedMixin
    
    # Foreign Keys
    product_id = Column(String(100), ForeignKey('inventory.id'), nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey('suppliers.id'), nullable=False, index=True)
    
    # Supplier-specific product info
    supplier_product_code = Column(String(100))  # Supplier's code for this product
    supplier_product_name = Column(String(200))  # Supplier's name for this product
    
    # Pricing
    unit_cost = Column(Numeric(10, 2))  # Cost per unit from this supplier
    currency = Column(String(10), default='TRY')
    minimum_order_quantity = Column(Integer, default=1)
    
    # Lead Time
    lead_time_days = Column(Integer)  # Delivery time in days
    
    # Priority
    is_primary = Column(Boolean, default=False)  # Primary supplier for this product
    priority = Column(Integer, default=1)  # Lower number = higher priority
    
    # Status
    is_active = Column(Boolean, default=True, index=True)
    
    # Notes
    notes = Column(Text)
    
    # Timestamps inherited from BaseModel
    last_order_date = Column(DateTime)
    
    # Relationships
    supplier = relationship('Supplier', back_populates='products')
    product = relationship('InventoryItem', backref='suppliers')
    
    # Unique constraint: one product can have only one entry per supplier
    __table_args__ = (
        db.UniqueConstraint('product_id', 'supplier_id', name='unique_product_supplier'),
        {'extend_existing': True}
    )
    
    def __repr__(self):
        return f'<ProductSupplier product_id={self.product_id} supplier_id={self.supplier_id}>'
    
    def to_dict(self, include_supplier=False, include_product=False):
        """Convert to dictionary"""
        result = {
            'id': self.id,
            'tenantId': self.tenant_id,
            'productId': self.product_id,
            'supplierId': self.supplier_id,
            'supplierProductCode': self.supplier_product_code,
            'supplierProductName': self.supplier_product_name,
            'unitCost': float(self.unit_cost) if self.unit_cost else None,
            'currency': self.currency,
            'minimumOrderQuantity': self.minimum_order_quantity,
            'leadTimeDays': self.lead_time_days,
            'isPrimary': self.is_primary,
            'priority': self.priority,
            'isActive': self.is_active,
            'notes': self.notes,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            'lastOrderDate': self.last_order_date.isoformat() if self.last_order_date else None
        }
        
        if include_supplier and self.supplier:
            result['supplier'] = self.supplier.to_dict()
        
        if include_product and self.product:
            result['product'] = {
                'id': self.product.id,
                'name': self.product.name,
                'sku': self.product.sku
            }
        
        return result
