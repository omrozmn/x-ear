# Product Media Model - Images/Videos for inventory items
from sqlalchemy import Column, Boolean, ForeignKey, Integer, String, Text
from .base import BaseModel, gen_id
from .mixins import TenantScopedMixin
from sqlalchemy.orm import relationship


class ProductMedia(BaseModel, TenantScopedMixin):
    __tablename__ = 'product_media'

    id = Column(String(50), primary_key=True)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = gen_id("pm")

    # Parent inventory item
    inventory_id = Column(String(50), ForeignKey('inventory.id', ondelete='CASCADE'), nullable=False, index=True)

    # Media info
    media_type = Column(String(20), default='image')  # image / video
    url = Column(Text)  # S3 URL
    s3_key = Column(String(500))  # For deletion and presigned URLs
    filename = Column(String(255))  # Original filename
    mime_type = Column(String(100))  # image/jpeg, video/mp4
    file_size = Column(Integer)  # Bytes
    width = Column(Integer)  # Pixels
    height = Column(Integer)  # Pixels

    # Ordering & display
    sort_order = Column(Integer, default=0)
    is_primary = Column(Boolean, default=False)
    alt_text = Column(String(500))  # SEO alt text

    # Source tracking
    source = Column(String(50), default='upload')  # upload/pexels/unsplash/ai_generated
    source_id = Column(String(255))  # External source ID (Pexels/Unsplash photo ID)

    # Marketplace compatibility info (JSON)
    marketplace_compatibility = Column(Text)  # {"trendyol": true, "hepsiburada": true, ...}

    # Relationship back to inventory
    inventory = relationship('InventoryItem', backref='media', lazy='select')

    def to_dict(self):
        base_dict = self.to_dict_base()
        media_dict = {
            'id': self.id,
            'inventoryId': self.inventory_id,
            'mediaType': self.media_type,
            'url': self.url,
            's3Key': self.s3_key,
            'filename': self.filename,
            'mimeType': self.mime_type,
            'fileSize': self.file_size,
            'width': self.width,
            'height': self.height,
            'sortOrder': self.sort_order,
            'isPrimary': self.is_primary,
            'altText': self.alt_text,
            'source': self.source,
            'sourceId': self.source_id,
            'marketplaceCompatibility': self.marketplace_compatibility,
        }
        media_dict.update(base_dict)
        return media_dict
