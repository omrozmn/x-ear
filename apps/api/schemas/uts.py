"""
UTS Schemas
"""
from typing import Optional, List, Dict, Any
from pydantic import Field
from .base import AppBaseModel

class BulkRegistration(AppBaseModel):
    device_ids: List[str]
    priority: Optional[str] = "normal"

class UtsRegistrationListResponse(AppBaseModel):
    success: bool
    data: List[Any]
    meta: Dict[str, Any]

class UtsJobStartResponse(AppBaseModel):
    success: bool
    data: Dict[str, str] # {"job_id": ...}
    message: str

class UtsJobStatusResponse(AppBaseModel):
    success: bool
    data: Dict[str, Any]

class UtsCancelResponse(AppBaseModel):
    success: bool
    message: str
