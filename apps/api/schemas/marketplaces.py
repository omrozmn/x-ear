"""
Marketplace Integration Schemas
"""
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime

from schemas.base import AppBaseModel, IDMixin, TimestampMixin


class MarketplaceIntegrationRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading MarketplaceIntegration - replaces to_dict()"""
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    platform: Optional[str] = None
    name: Optional[str] = None
    api_key: Optional[str] = Field(None, alias="apiKey")
    api_secret: Optional[str] = Field(None, alias="apiSecret")
    seller_id: Optional[str] = Field(None, alias="sellerId")
    sync_stock: Optional[bool] = Field(None, alias="syncStock")
    sync_prices: Optional[bool] = Field(None, alias="syncPrices")
    sync_orders: Optional[bool] = Field(None, alias="syncOrders")
    status: Optional[str] = None
    last_sync_at: Optional[datetime] = Field(None, alias="lastSyncAt")


class MarketplaceIntegrationCreate(AppBaseModel):
    """Schema for creating MarketplaceIntegration"""
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    platform: Optional[str] = None
    name: Optional[str] = None
    api_key: Optional[str] = Field(None, alias="apiKey")
    api_secret: Optional[str] = Field(None, alias="apiSecret")
    seller_id: Optional[str] = Field(None, alias="sellerId")
    sync_stock: Optional[bool] = Field(True, alias="syncStock")
    sync_prices: Optional[bool] = Field(True, alias="syncPrices")
    sync_orders: Optional[bool] = Field(True, alias="syncOrders")


class MarketplaceIntegrationUpdate(AppBaseModel):
    """Schema for updating MarketplaceIntegration"""
    platform: Optional[str] = None
    name: Optional[str] = None
    api_key: Optional[str] = Field(None, alias="apiKey")
    api_secret: Optional[str] = Field(None, alias="apiSecret")
    seller_id: Optional[str] = Field(None, alias="sellerId")
    sync_stock: Optional[bool] = Field(None, alias="syncStock")
    sync_prices: Optional[bool] = Field(None, alias="syncPrices")
    sync_orders: Optional[bool] = Field(None, alias="syncOrders")