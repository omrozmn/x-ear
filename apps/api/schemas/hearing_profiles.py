"""
Hearing Profile Schemas
"""
from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing import Optional, List, Dict, Any
from datetime import datetime

from schemas.base import AppBaseModel, IDMixin, TimestampMixin


class HearingTestRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading HearingTest - replaces to_dict()"""
    party_id: str = Field(..., alias="partyId")
    test_date: Optional[datetime] = Field(None, alias="testDate")
    audiogram_data: Optional[Dict[str, Any]] = Field(None, alias="audiogramData")
    test_type: Optional[str] = Field(None, alias="testType")
    conducted_by: Optional[str] = Field(None, alias="conductedBy")
    audiologist: Optional[str] = None # Alias for conductedBy
    notes: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def map_orm_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Map common internal names if provided as dict
            if 'audiogramData' in data and 'audiogram_data' not in data:
                data['audiogram_data'] = data.pop('audiogramData')
            if 'testType' in data and 'test_type' not in data:
                data['test_type'] = data.pop('testType')
            if 'conductedBy' in data and 'conducted_by' not in data:
                data['conducted_by'] = data.pop('conductedBy')
            return data
        elif hasattr(data, '_sa_instance_state') or hasattr(data, '__dict__'):
            res = {}
            for field_name in cls.model_fields.keys():
                if field_name == 'audiogram_data':
                    val = getattr(data, 'results_json', {})
                    res[field_name] = val if val is not None else {}
                elif field_name == 'audiologist' or field_name == 'conducted_by':
                    res[field_name] = getattr(data, 'conducted_by', None)
                elif hasattr(data, field_name):
                    res[field_name] = getattr(data, field_name)
            return res
        return data


class EReceiptRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading EReceipt - replaces to_dict()"""
    party_id: str = Field(..., alias="partyId")
    sgk_report_id: Optional[str] = Field(None, alias="sgkReportId")
    number: Optional[str] = None
    materials: Optional[List[Dict[str, Any]]] = None
    receipt_number: Optional[str] = Field(None, alias="receiptNumber")
    hospital_name: Optional[str] = Field(None, alias="hospitalName")
    status: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def map_orm_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return data
        elif hasattr(data, '_sa_instance_state') or hasattr(data, '__dict__'):
            res = {}
            for field_name in cls.model_fields.keys():
                if field_name == 'materials':
                    val = getattr(data, 'materials_json', [])
                    res[field_name] = val if val is not None else []
                elif field_name == 'number' or field_name == 'receipt_number':
                    res[field_name] = getattr(data, 'receipt_number', None)
                elif hasattr(data, field_name):
                    res[field_name] = getattr(data, field_name)
            return res
        return data


class HearingTestCreate(AppBaseModel):
    """Schema for creating HearingTest"""
    test_date: str = Field(..., alias="testDate")
    audiologist: Optional[str] = None
    conducted_by: Optional[str] = Field(None, alias="conductedBy")
    audiogram_data: Optional[Dict[str, Any]] = Field(None, alias="audiogramData")
    test_type: Optional[str] = Field(None, alias="testType")
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