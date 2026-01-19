"""
Scan Queue Schemas - Pydantic models for ScanQueue domain
"""
from typing import Optional
from datetime import datetime
from pydantic import Field, ConfigDict
from .base import AppBaseModel, IDMixin, TimestampMixin


class ScanQueueRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading a scan queue entry - matches ScanQueue.to_dict() output"""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    tenant_id: str = Field(..., alias="tenantId")
    party_id: str = Field(..., alias="partyId")
    status: str = "pending"  # pending, processing, completed, failed
    priority: str = "normal"  # low, normal, high
    file_path: Optional[str] = Field(None, alias="filePath")
    model_path: Optional[str] = Field(None, alias="modelPath")
    polygon_count: Optional[int] = Field(None, alias="polygonCount")
    render_time_ms: Optional[int] = Field(None, alias="renderTimeMs")
    error_message: Optional[str] = Field(None, alias="errorMessage")
    started_at: Optional[datetime] = Field(None, alias="startedAt")
    completed_at: Optional[datetime] = Field(None, alias="completedAt")
