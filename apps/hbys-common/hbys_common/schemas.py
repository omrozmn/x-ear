"""
Shared Pydantic schemas for HBYS microservices.
"""
from datetime import datetime
from typing import Any, Generic, Optional, TypeVar
from pydantic import BaseModel, ConfigDict
from humps import camelize


def to_camel(string: str) -> str:
    return camelize(string)


class AppBaseModel(BaseModel):
    """Base schema with camelCase aliases for all HBYS services."""
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class IDMixin(BaseModel):
    id: str


class TimestampMixin(BaseModel):
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


T = TypeVar("T")


class ResponseMeta(AppBaseModel):
    total: int = 0
    page: int = 1
    per_page: int = 20


class ResponseEnvelope(AppBaseModel, Generic[T]):
    """Standard API response wrapper."""
    success: bool = True
    data: Optional[T] = None
    meta: Optional[ResponseMeta] = None
    error: Optional[str] = None

    @classmethod
    def ok(cls, data: Any = None, meta: Optional[ResponseMeta] = None):
        return cls(success=True, data=data, meta=meta)

    @classmethod
    def fail(cls, error: str, data: Any = None):
        return cls(success=False, error=error, data=data)


class PaginationParams(AppBaseModel):
    page: int = 1
    per_page: int = 20

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.per_page
