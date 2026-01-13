from datetime import datetime, timezone
from typing import Generic, TypeVar, Optional

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

T = TypeVar("T")

class AppBaseModel(BaseModel):
    """
    Base model for all application schemas.
    Configures Pydantic to handle ORM objects and enum conversions automatically.
    """
    model_config = ConfigDict(
        from_attributes=True,  # Replaces orm_mode=True in v2
        populate_by_name=True,
        alias_generator=to_camel,
        use_enum_values=True,
        arbitrary_types_allowed=True
    )

class IDMixin(BaseModel):
    """Mixin for models that have an ID."""
    id: str = Field(..., description="Unique identifier for the resource")
    
    model_config = ConfigDict(populate_by_name=True)

class TimestampMixin(BaseModel):
    """Mixin for models that track creation and update times."""
    created_at: Optional[datetime] = Field(None, description="Creation timestamp", alias="createdAt")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp", alias="updatedAt")
    
    model_config = ConfigDict(populate_by_name=True)

class ResponseMeta(AppBaseModel):
    """Metadata for response envelopes (pagination, etc.)"""
    total: Optional[int] = None
    page: Optional[int] = None
    per_page: Optional[int] = None
    total_pages: Optional[int] = None
    has_next: Optional[bool] = None
    next_cursor: Optional[str] = None

class ResponseEnvelope(BaseModel, Generic[T]):
    """
    Standard response envelope for all API responses.
    Matches the existing Flask 'success_response' format.
    """
    success: bool = True
    data: Optional[T] = None
    message: Optional[str] = None
    error: Optional[object] = None
    meta: Optional[ResponseMeta] = None
    request_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
        json_encoders={
            datetime: lambda v: v.isoformat()
        }
    )


class ApiError(AppBaseModel):
    success: bool = False
    message: str
    code: str
    details: Optional[object] = None

# Common utility schemas
class EmptyResponse(BaseModel):
    """Schema for empty responses (e.g. 204 or simple success)"""
    success: bool = True
