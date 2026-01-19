"""
Timeline Schemas
"""
from typing import Optional, List, Dict, Any
from pydantic import Field
from .base import AppBaseModel

class TimelineEventCreate(AppBaseModel):
    type: str
    title: str
    description: Optional[str] = ""
    details: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    user: Optional[str] = "system"
    icon: Optional[str] = "fa-circle"
    color: Optional[str] = "blue"
    category: Optional[str] = "general"
    id: Optional[str] = None

class TimelineEventRead(TimelineEventCreate):
    party_id: Optional[str] = Field(None, alias="partyId")
    source: Optional[str] = None
    entity_type: Optional[str] = Field(None, alias="entityType")
    entity_id: Optional[str] = Field(None, alias="entityId")

class TimelineListResponse(AppBaseModel):
    events: List[TimelineEventRead]
