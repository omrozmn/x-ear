"""
Plan Schemas - Pydantic models for Plan domain
"""
from typing import Optional, List, Dict, Any, Union
from pydantic import Field, field_validator
from .base import AppBaseModel, IDMixin, TimestampMixin


class PlanBase(AppBaseModel):
    """Base plan schema"""
    name: str = Field(..., description="Plan name")
    description: Optional[str] = Field(None, description="Plan description")
    plan_type: str = Field("BASIC", alias="planType", description="Plan type")
    price: float = Field(..., description="Plan price")
    billing_interval: str = Field("YEARLY", alias="billingInterval", description="Billing interval")
    features: Optional[Union[Dict[str, Any], List[Any]]] = Field(None, description="Plan features")
    max_users: Optional[int] = Field(None, alias="maxUsers", description="Max users")
    max_storage_gb: Optional[int] = Field(None, alias="maxStorageGb", description="Max storage in GB")
    is_active: bool = Field(True, alias="isActive", description="Is plan active")
    is_public: bool = Field(True, alias="isPublic", description="Is plan public")

    @field_validator('features', mode='before')
    @classmethod
    def ensure_json(cls, v):
        """Parse JSON string to dict/list if needed"""
        if isinstance(v, str) and (v.startswith('{') or v.startswith('[')):
            import json
            try:
                return json.loads(v)
            except:
                return v
        return v


class PlanCreate(PlanBase):
    """Schema for creating a plan"""
    pass


class PlanUpdate(AppBaseModel):
    """Schema for updating a plan"""
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    features: Optional[Dict[str, str]] = None
    is_active: Optional[bool] = Field(None, alias="isActive")
    is_public: Optional[bool] = Field(None, alias="isPublic")
    max_users: Optional[int] = Field(None, alias="maxUsers")


class DetailedPlanRead(PlanBase, IDMixin, TimestampMixin):
    """Schema for reading a plan"""
    slug: Optional[str] = None
    tenant_count: int = Field(0, alias="tenantCount", description="Number of tenants using this plan")


# Type aliases for frontend compatibility
Plan = DetailedPlanRead
PlanInput = PlanCreate
