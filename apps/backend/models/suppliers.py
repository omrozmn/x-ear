"""
Suppliers and Product-Supplier Relationship Models
"""
from datetime import datetime, timezone
import json
from .base import db, BaseModel


class Supplier(BaseModel):
    """
    Supplier model represents companies that supply products to the business.
    """
    __tablename__ = 'suppliers'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=False, index=True)
    
    # Company Information
    company_name = db.Column(db.String(200), nullable=False, unique=True, index=True)
    company_code = db.Column(db.String(50), unique=True, index=True)  # Optional internal code
    tax_number = db.Column(db.String(50))
    tax_office = db.Column(db.String(100))
    
    # Contact Information
    contact_person = db.Column(db.String(100))
    email = db.Column(db.String(120), index=True)
    phone = db.Column(db.String(20))
    mobile = db.Column(db.String(20))
    fax = db.Column(db.String(20))
    website = db.Column(db.String(200))
    
    # Address
    address = db.Column(db.Text)
    city = db.Column(db.String(100))
    country = db.Column(db.String(100), default='Türkiye')
    postal_code = db.Column(db.String(20))
    
    # Payment Terms
    payment_terms = db.Column(db.String(100))  # e.g., "Net 30", "Net 60", "COD"
    currency = db.Column(db.String(10), default='TRY')
    
    # Rating & Notes
    rating = db.Column(db.Integer)  # 1-5 stars
    notes = db.Column(db.Text)
    
    # Status
    is_active = db.Column(db.Boolean, default=True, index=True)
    
    # Timestamps inherited from BaseModel
    
    # Relationships
    products = db.relationship('ProductSupplier', back_populates='supplier', cascade='all, delete-orphan')
    
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


class ProductSupplier(BaseModel):
    """
    Product-Supplier Relationship Model
    Many-to-many relationship with additional fields
    """
    __tablename__ = 'product_suppliers'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Foreign Keys
    product_id = db.Column(db.String(100), db.ForeignKey('inventory.id'), nullable=False, index=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey('suppliers.id'), nullable=False, index=True)
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=False, index=True)
    
    # Supplier-specific product info
    supplier_product_code = db.Column(db.String(100))  # Supplier's code for this product
    supplier_product_name = db.Column(db.String(200))  # Supplier's name for this product
    
    # Pricing
    unit_cost = db.Column(db.Numeric(10, 2))  # Cost per unit from this supplier
    currency = db.Column(db.String(10), default='TRY')
    minimum_order_quantity = db.Column(db.Integer, default=1)
    
    # Lead Time
    lead_time_days = db.Column(db.Integer)  # Delivery time in days
    
    # Priority
    is_primary = db.Column(db.Boolean, default=False)  # Primary supplier for this product
    priority = db.Column(db.Integer, default=1)  # Lower number = higher priority
    
    # Status
    is_active = db.Column(db.Boolean, default=True, index=True)
    
    # Notes
    notes = db.Column(db.Text)
    
    # Timestamps inherited from BaseModel
    last_order_date = db.Column(db.DateTime)
    
    # Relationships
    supplier = db.relationship('Supplier', back_populates='products')
    product = db.relationship('Inventory', backref='suppliers')
    
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
            'product_id': self.product_id,
            'supplier_id': self.supplier_id,
            'supplier_product_code': self.supplier_product_code,
            'supplier_product_name': self.supplier_product_name,
            'unit_cost': float(self.unit_cost) if self.unit_cost else None,
            'currency': self.currency,
            'minimum_order_quantity': self.minimum_order_quantity,
            'lead_time_days': self.lead_time_days,
            'is_primary': self.is_primary,
            'priority': self.priority,
            'is_active': self.is_active,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_order_date': self.last_order_date.isoformat() if self.last_order_date else None
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
