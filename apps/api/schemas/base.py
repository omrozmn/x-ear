from datetime import datetime, timezone
from typing import Generic, TypeVar, Optional, Any

from pydantic import BaseModel, ConfigDict, Field, field_serializer
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
        arbitrary_types_allowed=True,
        protected_namespaces=()
    )
    
    @field_serializer('*', when_used='json', check_fields=False)
    def serialize_datetime(self, value: Any) -> Any:
        """Serialize datetime objects to ISO format strings."""
        if isinstance(value, datetime):
            return value.isoformat()
        return value

class IDMixin(BaseModel):
    """Mixin for models that have an ID."""
    id: str = Field(..., description="Unique identifier for the resource")
    
    model_config = ConfigDict(populate_by_name=True, protected_namespaces=())

class TimestampMixin(BaseModel):
    """Mixin for models that track creation and update times."""
    created_at: Optional[datetime] = Field(None, description="Creation timestamp", alias="createdAt")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp", alias="updatedAt")
    
    model_config = ConfigDict(populate_by_name=True, protected_namespaces=())

class ResponseMeta(AppBaseModel):
    """Metadata for response envelopes (pagination, etc.)"""
    total: Optional[int] = None
    page: Optional[int] = None
    per_page: Optional[int] = Field(None, alias="perPage")
    total_pages: Optional[int] = Field(None, alias="totalPages")
    has_next: Optional[bool] = Field(None, alias="hasNext")
    next_cursor: Optional[str] = Field(None, alias="nextCursor")

    model_config = ConfigDict(extra='allow')

class ResponseEnvelope(AppBaseModel, Generic[T]):
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

    @field_serializer('timestamp', when_used='json')
    def serialize_timestamp(self, value: datetime) -> str:
        """Serialize timestamp to ISO format string."""
        return value.isoformat()


class ApiError(AppBaseModel):
    success: bool = False
    message: str
    code: str
    details: Optional[object] = None

# Common utility schemas
class EmptyResponse(BaseModel):
    """Schema for empty responses (e.g. 204 or simple success)"""
    success: bool = True
