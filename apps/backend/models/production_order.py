# Production Order Model
from .base import db, BaseModel, gen_id
from datetime import datetime

class ProductionOrder(BaseModel):
    __tablename__ = 'production_orders'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id('prod'))
    tenant_id = db.Column(db.String(50), nullable=False)
    patient_id = db.Column(db.String(50), nullable=False)
    
    order_number = db.Column(db.String(50), unique=True, nullable=False)
    product_type = db.Column(db.String(50)) # mold, filter, device
    
    status = db.Column(db.String(20), default='new') # new, in_production, quality_check, shipped, delivered
    
    manufacturer = db.Column(db.String(100))
    estimated_delivery_date = db.Column(db.DateTime)
    
    notes = db.Column(db.Text)
    
    def to_dict(self):
        base = self.to_dict_base()
        d = {
            'id': self.id,
            'tenantId': self.tenant_id,
            'patientId': self.patient_id,
            'orderNumber': self.order_number,
            'productType': self.product_type,
            'status': self.status,
            'manufacturer': self.manufacturer,
            'estimatedDeliveryDate': self.estimated_delivery_date.isoformat() if self.estimated_delivery_date else None,
            'notes': self.notes,
        }
        d.update(base)
        return d
