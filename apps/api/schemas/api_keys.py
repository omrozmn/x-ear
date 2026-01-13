"""API Keys Schemas"""
from typing import Optional, List
from pydantic import Field
from .base import AppBaseModel, IDMixin, TimestampMixin, ResponseEnvelope

class ApiKeyCreate(AppBaseModel):
    tenant_id: str = Field(..., alias="tenantId")
    name: Optional[str] = None
    scopes: Optional[List[str]] = []
    rate_limit: Optional[int] = Field(1000, alias="rateLimit")

class ApiKeyUpdate(AppBaseModel):
    name: Optional[str] = None
    scopes: Optional[List[str]] = None
    rate_limit: Optional[int] = Field(None, alias="rateLimit")
    is_active: Optional[bool] = Field(None, alias="isActive")

class ApiKeyRead(IDMixin, TimestampMixin):
    name: Optional[str] = None
    tenant_id: str = Field(..., alias="tenantId")
    prefix: Optional[str] = None
    scopes: Optional[List[str]] = []
    rate_limit: int = Field(1000, alias="rateLimit")
    is_active: bool = Field(True, alias="isActive")
    created_by: Optional[str] = Field(None, alias="createdBy")
    last_used_at: Optional[str] = Field(None, alias="lastUsedAt")

# Type alias
ApiKey = ApiKeyRead
