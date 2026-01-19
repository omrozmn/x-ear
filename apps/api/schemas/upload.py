"""
Upload Schemas
"""
from typing import Optional, Dict, List, Any
from pydantic import BaseModel
from .base import AppBaseModel

class PresignedUploadRequest(AppBaseModel):
    filename: str
    folder: str = "uploads"
    content_type: Optional[str] = None

class PresignedUploadResponse(AppBaseModel):
    url: str
    fields: Dict[str, Any]
    key: str

class FileListResponse(AppBaseModel):
    files: List[Any] # s3_service.list_files returns list of dicts/objects
