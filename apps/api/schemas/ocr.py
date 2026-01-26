"""
OCR Schemas - Pydantic models for OCR domain
"""
from typing import Any, Dict, List, Optional
from enum import Enum
from pydantic import Field, ConfigDict
from .base import AppBaseModel, IDMixin, TimestampMixin


class JobStatus(str, Enum):
    PENDING = 'pending'
    PROCESSING = 'processing'
    COMPLETED = 'completed'
    FAILED = 'failed'


class OcrJobRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading an OCR job"""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    tenant_id: str = Field(..., alias="tenantId")
    file_path: str = Field(..., alias="filePath")
    document_type: str = Field(..., alias="documentType")
    status: JobStatus
    result: Optional[Any] = None
    patient_name: Optional[str] = Field(None, alias="patientName")
    error_message: Optional[str] = Field(None, alias="errorMessage")

# --- Request Schemas ---

class OcrProcessRequest(AppBaseModel):
    image_path: Optional[str] = Field(None, alias="imagePath")
    text: Optional[str] = None
    ocr_text: Optional[str] = Field(None, alias="ocrText")
    type: str = "medical"
    auto_crop: bool = Field(True, alias="autoCrop")

class SimilarityRequest(AppBaseModel):
    image_path1: Optional[str] = Field(None, alias="imagePath1")
    image_path2: Optional[str] = Field(None, alias="imagePath2")
    text1: Optional[str] = None
    text2: Optional[str] = None
    textA: Optional[str] = None
    textB: Optional[str] = None

class EntityExtractionRequest(AppBaseModel):
    image_path: Optional[str] = Field(None, alias="imagePath")
    text: Optional[str] = None
    ocr_text: Optional[str] = Field(None, alias="ocrText")
    auto_crop: bool = Field(False, alias="autoCrop")

class PatientExtractionRequest(AppBaseModel):
    image_path: Optional[str] = Field(None, alias="imagePath")
    text: Optional[str] = None
    auto_crop: bool = Field(False, alias="autoCrop")

class DebugNERRequest(AppBaseModel):
    text: str

class CreateJobRequest(AppBaseModel):
    file_path: str = Field(..., alias="filePath")
    type: str = "medical"

# --- Response Schemas ---

class OcrHealthResponse(AppBaseModel):
    status: str
    ocr_available: bool = Field(..., alias="ocrAvailable")
    spacy_available: bool = Field(..., alias="spacyAvailable")
    hf_ner_available: bool = Field(..., alias="hfNerAvailable")
    database_connected: bool = Field(..., alias="databaseConnected")
    timestamp: str

class OcrInitResponse(AppBaseModel):
    message: str
    timestamp: str

class OcrProcessResponse(AppBaseModel):
    result: Dict[str, Any]
    timestamp: str

class OcrSimilarityResponse(AppBaseModel):
    result: float
    timestamp: str

class OcrEntitiesResponse(AppBaseModel):
    entities: List[Dict[str, Any]]
    timestamp: str

class OcrPatientResponse(AppBaseModel):
    patient_info: Optional[Dict[str, Any]] = Field(None, alias="patientInfo")
    timestamp: str

class OcrDebugResponse(AppBaseModel):
    result: Dict[str, Any]
    timestamp: str

