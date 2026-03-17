from typing import Optional
from datetime import datetime
from pydantic import Field
from .base import AppBaseModel, IDMixin, TimestampMixin


class MarketplaceListingBase(AppBaseModel):
    listing_data: Optional[str] = Field(None, alias="listingData")
    marketplace_title: Optional[str] = Field(None, alias="marketplaceTitle")
    marketplace_description: Optional[str] = Field(None, alias="marketplaceDescription")
    marketplace_price: Optional[float] = Field(None, alias="marketplacePrice")
    marketplace_stock: Optional[int] = Field(None, alias="marketplaceStock")
    marketplace_barcode: Optional[str] = Field(None, alias="marketplaceBarcode")
    marketplace_brand: Optional[str] = Field(None, alias="marketplaceBrand")
    marketplace_category_id: Optional[str] = Field(None, alias="marketplaceCategoryId")
    status: str = 'draft'


class MarketplaceListingCreate(AppBaseModel):
    integration_id: str = Field(..., alias="integrationId")
    listing_data: Optional[str] = Field(None, alias="listingData")
    marketplace_title: Optional[str] = Field(None, alias="marketplaceTitle")
    marketplace_description: Optional[str] = Field(None, alias="marketplaceDescription")
    marketplace_price: Optional[float] = Field(None, alias="marketplacePrice")
    marketplace_stock: Optional[int] = Field(None, alias="marketplaceStock")
    marketplace_barcode: Optional[str] = Field(None, alias="marketplaceBarcode")
    marketplace_brand: Optional[str] = Field(None, alias="marketplaceBrand")
    marketplace_category_id: Optional[str] = Field(None, alias="marketplaceCategoryId")


class MarketplaceListingUpdate(AppBaseModel):
    listing_data: Optional[str] = Field(None, alias="listingData")
    marketplace_title: Optional[str] = Field(None, alias="marketplaceTitle")
    marketplace_description: Optional[str] = Field(None, alias="marketplaceDescription")
    marketplace_price: Optional[float] = Field(None, alias="marketplacePrice")
    marketplace_stock: Optional[int] = Field(None, alias="marketplaceStock")
    marketplace_barcode: Optional[str] = Field(None, alias="marketplaceBarcode")
    marketplace_brand: Optional[str] = Field(None, alias="marketplaceBrand")
    marketplace_category_id: Optional[str] = Field(None, alias="marketplaceCategoryId")
    status: Optional[str] = None


class MarketplaceListingRead(MarketplaceListingBase, IDMixin, TimestampMixin):
    inventory_id: str = Field(..., alias="inventoryId")
    integration_id: str = Field(..., alias="integrationId")
    remote_product_id: Optional[str] = Field(None, alias="remoteProductId")
    last_synced_at: Optional[datetime] = Field(None, alias="lastSyncedAt")
    error_message: Optional[str] = Field(None, alias="errorMessage")


class AIFillRequest(AppBaseModel):
    platform: Optional[str] = None  # If None, fill all active platforms


class AIFillResponse(AppBaseModel):
    platform: str
    marketplace_title: Optional[str] = Field(None, alias="marketplaceTitle")
    marketplace_description: Optional[str] = Field(None, alias="marketplaceDescription")
    marketplace_price: Optional[float] = Field(None, alias="marketplacePrice")
    listing_data: Optional[str] = Field(None, alias="listingData")
