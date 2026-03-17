from typing import Optional
from pydantic import Field
from .base import AppBaseModel, IDMixin, TimestampMixin


class CargoIntegrationBase(AppBaseModel):
    platform: str
    name: Optional[str] = None
    customer_id: Optional[str] = Field(None, alias="customerId")
    is_active: bool = Field(True, alias="isActive")


class CargoIntegrationCreate(AppBaseModel):
    platform: str
    name: Optional[str] = None
    api_key: Optional[str] = Field(None, alias="apiKey")
    api_secret: Optional[str] = Field(None, alias="apiSecret")
    customer_id: Optional[str] = Field(None, alias="customerId")
    other_params: Optional[str] = Field(None, alias="otherParams")


class CargoIntegrationUpdate(AppBaseModel):
    name: Optional[str] = None
    api_key: Optional[str] = Field(None, alias="apiKey")
    api_secret: Optional[str] = Field(None, alias="apiSecret")
    customer_id: Optional[str] = Field(None, alias="customerId")
    other_params: Optional[str] = Field(None, alias="otherParams")
    is_active: Optional[bool] = Field(None, alias="isActive")


class CargoIntegrationRead(CargoIntegrationBase, IDMixin, TimestampMixin):
    status: str = 'disconnected'
