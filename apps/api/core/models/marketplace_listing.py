# Marketplace Product Listing Model - Per-marketplace product listings
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from .base import BaseModel, gen_id
from .mixins import TenantScopedMixin
from sqlalchemy.orm import relationship


class MarketplaceProductListing(BaseModel, TenantScopedMixin):
    __tablename__ = 'marketplace_product_listings'

    id = Column(String(50), primary_key=True)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = gen_id("mpl")

    # References
    inventory_id = Column(String(50), ForeignKey('inventory.id', ondelete='CASCADE'), nullable=False, index=True)
    integration_id = Column(String(50), ForeignKey('marketplace_integrations.id', ondelete='CASCADE'), nullable=False, index=True)

    # Platform-specific data (JSON blob for all fields)
    listing_data = Column(Text)  # JSON: platform-specific fields

    # Common marketplace fields (denormalized for quick access)
    marketplace_title = Column(String(500))
    marketplace_description = Column(Text)
    marketplace_price = Column(Float)
    marketplace_stock = Column(Integer)
    marketplace_barcode = Column(String(100))
    marketplace_brand = Column(String(200))
    marketplace_category_id = Column(String(100))

    # Sync status
    status = Column(String(20), default='draft')  # draft/published/error
    remote_product_id = Column(String(100))  # Product ID on the marketplace
    last_synced_at = Column(DateTime)
    error_message = Column(Text)

    # Relationships
    inventory = relationship('InventoryItem', backref='marketplace_listings', lazy='select')
    integration = relationship('MarketplaceIntegration', backref='listings', lazy='select')

    def to_dict(self):
        base_dict = self.to_dict_base()
        listing_dict = {
            'id': self.id,
            'inventoryId': self.inventory_id,
            'integrationId': self.integration_id,
            'listingData': self.listing_data,
            'marketplaceTitle': self.marketplace_title,
            'marketplaceDescription': self.marketplace_description,
            'marketplacePrice': self.marketplace_price,
            'marketplaceStock': self.marketplace_stock,
            'marketplaceBarcode': self.marketplace_barcode,
            'marketplaceBrand': self.marketplace_brand,
            'marketplaceCategoryId': self.marketplace_category_id,
            'status': self.status,
            'remoteProductId': self.remote_product_id,
            'lastSyncedAt': self.last_synced_at.isoformat() if self.last_synced_at else None,
            'errorMessage': self.error_message,
        }
        listing_dict.update(base_dict)
        return listing_dict
