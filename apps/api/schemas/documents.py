"""
Document Schemas
"""
from typing import Optional
from pydantic import Field, ConfigDict
from .base import AppBaseModel, IDMixin, TimestampMixin


class DocumentCreate(AppBaseModel):
    id: Optional[str] = None
    file_name: str = Field(..., alias="fileName")
    original_name: Optional[str] = Field(None, alias="originalName")
    type: str
    content: str  # Base64 encoded
    metadata: Optional[dict] = None
    mime_type: Optional[str] = Field("application/octet-stream", alias="mimeType")
    uploaded_at: Optional[str] = Field(None, alias="uploadedAt")
    created_by: Optional[str] = Field("system", alias="createdBy")
    status: Optional[str] = "completed"

class DocumentRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading Document"""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    party_id: str = Field(..., alias="partyId")
    file_name: str = Field(..., alias="fileName")
    original_name: Optional[str] = Field(None, alias="originalName")
    type: str
    file_path: Optional[str] = Field(None, alias="filePath")
    metadata: Optional[dict] = None
    mime_type: Optional[str] = Field(None, alias="mimeType")
    size: Optional[int] = 0
    uploaded_at: Optional[str] = Field(None, alias="uploadedAt")
    created_by: Optional[str] = Field(None, alias="createdBy")
    status: Optional[str] = None
