"""
Hearing Profile Schemas
"""
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

from schemas.base import AppBaseModel, IDMixin, TimestampMixin


class HearingTestRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading HearingTest - replaces to_dict()"""
    party_id: str = Field(..., alias="partyId")
    test_date: Optional[datetime] = Field(None, alias="testDate")
    audiologist: Optional[str] = None
    audiogram_data: Optional[Dict[str, Any]] = Field(None, alias="audiogramData")
    notes: Optional[str] = None


class EReceiptRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading EReceipt - replaces to_dict()"""
    party_id: str = Field(..., alias="partyId")
    sgk_report_id: Optional[str] = Field(None, alias="sgkReportId")
    number: Optional[str] = None
    doctor_name: Optional[str] = Field(None, alias="doctorName")
    date: Optional[datetime] = None
    materials: Optional[List[Dict[str, Any]]] = None
    status: Optional[str] = None


class HearingTestCreate(AppBaseModel):
    """Schema for creating HearingTest"""
    test_date: str = Field(..., alias="testDate")
    audiologist: Optional[str] = None
    audiogram_data: Optional[Dict[str, Any]] = Field(None, alias="audiogramData")
    notes: Optional[str] = None


class HearingTestUpdate(AppBaseModel):
    """Schema for updating HearingTest"""
    test_date: Optional[str] = Field(None, alias="testDate")
    audiologist: Optional[str] = None
    audiogram_data: Optional[Dict[str, Any]] = Field(None, alias="audiogramData")
    notes: Optional[str] = None


class EReceiptCreate(AppBaseModel):
    """Schema for creating EReceipt"""
    sgk_report_id: Optional[str] = Field(None, alias="sgkReportId")
    number: Optional[str] = None
    doctor_name: Optional[str] = Field(None, alias="doctorName")
    date: Optional[str] = None
    materials: Optional[List[Dict[str, Any]]] = None
    status: str = "pending"


class EReceiptUpdate(AppBaseModel):
    """Schema for updating EReceipt"""
    materials: Optional[List[Dict[str, Any]]] = None
    status: Optional[str] = None
    doctor_name: Optional[str] = Field(None, alias="doctorName")