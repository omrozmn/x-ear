from datetime import datetime, timezone
from typing import Generic, TypeVar, Optional

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")

class AppBaseModel(BaseModel):
    """
    Base model for all application schemas.
    Configures Pydantic to handle ORM objects and enum conversions automatically.
    """
    model_config = ConfigDict(
        from_attributes=True,  # Replaces orm_mode=True in v2
        populate_by_name=True,
        use_enum_values=True,
        arbitrary_types_allowed=True
    )

class IDMixin(AppBaseModel):
    """Mixin for models that have an ID."""
    id: str = Field(..., description="Unique identifier for the resource")

class TimestampMixin(AppBaseModel):
    """Mixin for models that track creation and update times."""
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")

class ResponseMeta(AppBaseModel):
    """Metadata for response envelopes (pagination, etc.)"""
    total: Optional[int] = None
    page: Optional[int] = None
    perPage: Optional[int] = Field(None, alias="per_page")
    totalPages: Optional[int] = Field(None, alias="total_pages")
    hasNext: Optional[bool] = Field(None, alias="has_next")
    nextCursor: Optional[str] = Field(None, alias="next_cursor")

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
    requestId: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = ConfigDict(
        populate_by_name=True,
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
