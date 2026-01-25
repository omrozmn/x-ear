from .base import db, BaseModel, gen_id
from .mixins import TenantScopedMixin
import sqlalchemy as sa


class Order(BaseModel, TenantScopedMixin):
    __tablename__ = 'orders'

    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id('ord'))
    # tenant_id is now inherited from TenantScopedMixin
    customer_id = db.Column(db.String(50), nullable=True)
    order_number = db.Column(db.String(50), unique=True, nullable=False)
    total_amount = db.Column(db.Numeric(12, 2), default=0)
    currency = db.Column(db.String(8), default='TRY')
    status = db.Column(db.String(32), default='new')

    def to_dict(self):
        base = self.to_dict_base()
        d = {
            'id': self.id,
            'tenantId': self.tenant_id,
            'customerId': self.customer_id,
            'orderNumber': self.order_number,
            'totalAmount': float(self.total_amount) if self.total_amount is not None else 0,
            'currency': self.currency,
            'status': self.status,
        }
        d.update(base)
        return d


class OrderItem(BaseModel):
    __tablename__ = 'order_items'

    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id('oit'))
    order_id = db.Column(db.String(50), sa.ForeignKey('orders.id'), nullable=False, index=True)
    product_type = db.Column(db.String(50))
    product_id = db.Column(db.String(50))
    quantity = db.Column(sa.Integer, default=1)
    unit_price = db.Column(sa.Numeric(12, 2), default=0)

    def to_dict(self):
        base = self.to_dict_base()
        d = {
            'id': self.id,
            'orderId': self.order_id,
            'productType': self.product_type,
            'productId': self.product_id,
            'quantity': self.quantity,
            'unitPrice': float(self.unit_price) if self.unit_price is not None else 0,
        }
        d.update(base)
        return d
