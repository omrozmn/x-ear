"""
Party Subresources Schemas - Pydantic models for Party Notes, etc.
"""
from typing import Optional, List, Any
from datetime import datetime
from pydantic import Field, ConfigDict
from .base import AppBaseModel, IDMixin, TimestampMixin


class PartyNoteRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading a party note - matches PatientNote.to_dict() output"""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    party_id: str = Field(..., alias="partyId")
    author_id: str = Field(..., alias="authorId")
    appointment_id: Optional[str] = Field(None, alias="appointmentId")
    note_type: Optional[str] = Field("clinical", alias="type")
    category: Optional[str] = "general"
    title: Optional[str] = None
    content: str
    is_private: bool = Field(False, alias="isPrivate")


class PartyNoteCreate(AppBaseModel):
    """Schema for creating a party note"""
    content: str
    type: str = "genel"
    category: str = "general"
    is_private: bool = Field(False, alias="isPrivate")
    created_by: str = Field("system", alias="createdBy")


class PartyNoteUpdate(AppBaseModel):
    """Schema for updating a party note"""
    content: Optional[str] = None
    title: Optional[str] = None
    note_type: Optional[str] = Field(None, alias="noteType")
    category: Optional[str] = None
    is_private: Optional[bool] = Field(None, alias="isPrivate")
    tags: Optional[List[str]] = None
