from typing import Generic, TypeVar, Optional, Any, Dict, List
from pydantic import BaseModel

T = TypeVar("T")

class ResponseEnvelope(BaseModel, Generic[T]):
    success: bool = True
    message: Optional[str] = None
    data: Optional[T] = None
    error: Optional[Any] = None
    meta: Optional[Dict[str, Any]] = None
    request_id: Optional[str] = None

class ErrorResponse(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None
