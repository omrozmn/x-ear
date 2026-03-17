from typing import List, Optional
from datetime import datetime
from pydantic import Field
from .base import AppBaseModel, IDMixin, TimestampMixin


class ProductMediaBase(AppBaseModel):
    media_type: str = Field('image', alias="mediaType")
    url: Optional[str] = None
    s3_key: Optional[str] = Field(None, alias="s3Key")
    filename: Optional[str] = None
    mime_type: Optional[str] = Field(None, alias="mimeType")
    file_size: Optional[int] = Field(None, alias="fileSize")
    width: Optional[int] = None
    height: Optional[int] = None
    sort_order: int = Field(0, alias="sortOrder")
    is_primary: bool = Field(False, alias="isPrimary")
    alt_text: Optional[str] = Field(None, alias="altText")
    source: str = 'upload'
    source_id: Optional[str] = Field(None, alias="sourceId")
    marketplace_compatibility: Optional[str] = Field(None, alias="marketplaceCompatibility")


class ProductMediaCreate(AppBaseModel):
    media_type: str = Field('image', alias="mediaType")
    url: str
    s3_key: Optional[str] = Field(None, alias="s3Key")
    filename: Optional[str] = None
    mime_type: Optional[str] = Field(None, alias="mimeType")
    file_size: Optional[int] = Field(None, alias="fileSize")
    width: Optional[int] = None
    height: Optional[int] = None
    is_primary: bool = Field(False, alias="isPrimary")
    alt_text: Optional[str] = Field(None, alias="altText")
    source: str = 'upload'
    source_id: Optional[str] = Field(None, alias="sourceId")


class ProductMediaUpdate(AppBaseModel):
    alt_text: Optional[str] = Field(None, alias="altText")
    is_primary: Optional[bool] = Field(None, alias="isPrimary")
    sort_order: Optional[int] = Field(None, alias="sortOrder")


class ProductMediaRead(ProductMediaBase, IDMixin, TimestampMixin):
    inventory_id: str = Field(..., alias="inventoryId")


class ProductMediaReorder(AppBaseModel):
    media_ids: List[str] = Field(..., alias="mediaIds")


class PresignedUrlRequest(AppBaseModel):
    filename: str
    content_type: Optional[str] = Field(None, alias="contentType")


class PresignedUrlResponse(AppBaseModel):
    url: str
    fields: Optional[dict] = None
    s3_key: str = Field(..., alias="s3Key")
