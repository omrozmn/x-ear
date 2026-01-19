"""
Order Schemas
"""
from typing import Optional, List
from pydantic import Field, ConfigDict
from .base import AppBaseModel
from datetime import datetime

class OrderItemCreate(AppBaseModel):
    product_type: str = Field(..., alias="productType")
    product_id: str = Field(..., alias="productId")
    quantity: int = 1
    unit_price: float = Field(0.0, alias="unitPrice")

class CreateOrderRequest(AppBaseModel):
    customer_id: Optional[str] = Field(None, alias="customerId")
    items: List[OrderItemCreate]

class OrderRead(AppBaseModel):
    """Schema for reading Order"""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    id: str
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    customer_id: Optional[str] = Field(None, alias="customerId")
    order_number: str = Field(..., alias="orderNumber")
    total_amount: float = Field(..., alias="totalAmount")
    status: str
    created_at: Optional[datetime] = Field(None, alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")
