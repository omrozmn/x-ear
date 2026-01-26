# Marketplace Integration Models
from .base import db, BaseModel, gen_id
from .mixins import TenantScopedMixin
from sqlalchemy.orm import relationship

class MarketplaceIntegration(BaseModel, TenantScopedMixin):
    __tablename__ = 'marketplace_integrations'
    
    id = db.Column(db.String(50), primary_key=True)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = gen_id("mkt")
            
    # tenant_id is now inherited from TenantScopedMixin
    
    platform = db.Column(db.String(50), nullable=False) # trendyol, hepsiburada, n11, amazon
    name = db.Column(db.String(100)) # "My Trendyol Store"
    
    # Credentials
    api_key = db.Column(db.String(255))
    api_secret = db.Column(db.String(255))
    seller_id = db.Column(db.String(100))
    other_params = db.Column(db.Text) # JSON for extra params
    
    is_active = db.Column(db.Boolean, default=True)
    
    # Sync settings
    sync_stock = db.Column(db.Boolean, default=True)
    sync_prices = db.Column(db.Boolean, default=True)
    sync_orders = db.Column(db.Boolean, default=True)
    
    last_sync_at = db.Column(db.DateTime)
    status = db.Column(db.String(20), default='connected') # connected, error, disconnected
    error_message = db.Column(db.Text)
    
    products = relationship('MarketplaceProduct', backref='integration', lazy='dynamic')

    def to_dict(self):
        base_dict = self.to_dict_base()
        mkt_dict = {
            'id': self.id,
            'platform': self.platform,
            'name': self.name,
            'sellerId': self.seller_id,
            'isActive': self.is_active,
            'syncStock': self.sync_stock,
            'syncPrices': self.sync_prices,
            'syncOrders': self.sync_orders,
            'lastSyncAt': self.last_sync_at.isoformat() if self.last_sync_at else None,
            'status': self.status,
            'errorMessage': self.error_message
        }
        mkt_dict.update(base_dict)
        return mkt_dict

class MarketplaceProduct(BaseModel, TenantScopedMixin):
    __tablename__ = 'marketplace_products'
    
    id = db.Column(db.String(50), primary_key=True)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = gen_id("mkp")
            
    # tenant_id is now inherited from TenantScopedMixin
    integration_id = db.Column(db.String(50), db.ForeignKey('marketplace_integrations.id'), nullable=False)
    
    local_product_type = db.Column(db.String(20)) # device, accessory
    local_product_id = db.Column(db.String(50))
    
    remote_product_id = db.Column(db.String(100)) # Platform's product ID
    remote_sku = db.Column(db.String(100))
    remote_price = db.Column(db.Numeric(12, 2))
    remote_stock = db.Column(db.Integer)
    
    is_synced = db.Column(db.Boolean, default=True)
    last_sync_at = db.Column(db.DateTime)
    
    def to_dict(self):
        base_dict = self.to_dict_base()
        prod_dict = {
            'id': self.id,
            'integrationId': self.integration_id,
            'localProductType': self.local_product_type,
            'localProductId': self.local_product_id,
            'remoteProductId': self.remote_product_id,
            'remoteSku': self.remote_sku,
            'remotePrice': float(self.remote_price) if self.remote_price else 0,
            'remoteStock': self.remote_stock,
            'isSynced': self.is_synced,
            'lastSyncAt': self.last_sync_at.isoformat() if self.last_sync_at else None
        }
        prod_dict.update(base_dict)
        return prod_dict
