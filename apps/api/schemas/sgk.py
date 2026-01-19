"""
SGK Schemas - Pydantic models for SGK domain
"""
from typing import Optional, Any, List, Dict
from datetime import datetime
from pydantic import Field, ConfigDict
from .base import AppBaseModel, IDMixin, TimestampMixin


class SgkDocumentRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading an SGK document"""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    party_id: str = Field(..., alias="partyId")
    filename: str
    document_type: str = Field(..., alias="documentType")
    content: Optional[str] = None
    processed: bool = False
    ocr_data: Optional[Any] = Field(None, alias="ocrData")

# --- Requests ---

class UploadSGKDocumentRequest(AppBaseModel):
    party_id: str = Field(..., alias="partyId")
    filename: str
    document_type: str = Field(..., alias="documentType")
    content: Optional[str] = None

class EReceiptQueryRequest(AppBaseModel):
    receipt_number: str = Field(..., alias="receiptNumber")
    tc_number: Optional[str] = Field(None, alias="tcNumber")
    party_id: Optional[str] = Field(None, alias="partyId")

class PatientRightsQueryRequest(AppBaseModel):
    tc_number: str = Field(..., alias="tcNumber")
    party_id: Optional[str] = Field(None, alias="partyId")

class WorkflowCreateRequest(AppBaseModel):
    party_id: str = Field(..., alias="partyId")
    document_id: Optional[str] = Field(None, alias="documentId")
    workflow_type: Optional[str] = Field("approval", alias="workflowType")

class WorkflowUpdateRequest(AppBaseModel):
    step_id: str = Field(..., alias="stepId")
    status: str
    notes: Optional[str] = ""

class WorkflowStatusUpdate(AppBaseModel):
    status: str

# --- Responses ---

class SgkDocumentListResponse(AppBaseModel):
    documents: List[Dict[str, Any]]
    count: int
    timestamp: str

class SgkDocumentResponse(AppBaseModel):
    document: Dict[str, Any]

class SgkUploadResponse(AppBaseModel):
    results: List[Dict[str, Any]]
    timestamp: str

class SgkEReceiptResponse(AppBaseModel):
    id: str
    receipt_number: str = Field(..., alias="receiptNumber")
    status: str
    prescriptions: List[Dict[str, Any]]
    valid_until: str = Field(..., alias="validUntil")
    query_date: str = Field(..., alias="queryDate")

class SgkEReceiptListResponse(AppBaseModel):
    patients: List[Dict[str, Any]]

class SgkPatientRightsResponse(AppBaseModel):
    has_insurance: bool = Field(..., alias="hasInsurance")
    insurance_number: str = Field(..., alias="insuranceNumber")
    insurance_type: str = Field(..., alias="insuranceType")
    coverage_percentage: float = Field(..., alias="coveragePercentage")
    approval_number: str = Field(..., alias="approvalNumber")
    approval_date: str = Field(..., alias="approvalDate")
    expiry_date: str = Field(..., alias="expiryDate")
    patient_rights: Dict[str, Any] = Field(..., alias="patientRights")
    query_date: str = Field(..., alias="queryDate")

class SgkWorkflowResponse(AppBaseModel):
    id: str
    party_id: Optional[str] = Field(None, alias="partyId")
    document_id: Optional[str] = Field(None, alias="documentId")
    workflow_type: Optional[str] = Field(None, alias="workflowType")
    status: str
    steps: List[Dict[str, Any]]
    created_at: Optional[str] = Field(None, alias="createdAt")
    updated_at: Optional[str] = Field(None, alias="updatedAt")
    current_step: Optional[str] = Field(None, alias="currentStep")

