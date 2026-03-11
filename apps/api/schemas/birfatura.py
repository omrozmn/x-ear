"""
BirFatura Schemas - Pydantic models for BirFatura domain
"""
from typing import Optional, Dict, List, Any
from pydantic import Field
from .base import AppBaseModel


class BirFaturaStats(AppBaseModel):
    """BirFatura statistics"""
    outgoing: Dict[str, int] = Field({}, description="Outgoing invoice stats by status")
    incoming: Dict[str, int] = Field({}, description="Incoming invoice stats by status")
    total_outgoing: int = Field(0, alias="totalOutgoing", description="Total outgoing invoices")
    total_incoming: int = Field(0, alias="totalIncoming", description="Total incoming invoices")


class BirFaturaLogEntry(AppBaseModel):
    """BirFatura log entry"""
    id: str
    action: str
    message: Optional[str] = None
    user_id: Optional[str] = Field(None, alias="userId")
    user_name: Optional[str] = Field(None, alias="userName")
    created_at: Optional[str] = Field(None, alias="createdAt")


class BirFaturaLogsResponse(AppBaseModel):
    """BirFatura logs response"""
    logs: List[BirFaturaLogEntry] = []
    pagination: Dict[str, int] = {}


class BirFaturaInvoiceItem(AppBaseModel):
    """BirFatura invoice item"""
    id: str
    invoice_number: Optional[str] = Field(None, alias="invoiceNumber")
    status: Optional[str] = None
    edocument_status: Optional[str] = Field(None, alias="edocumentStatus")
    total_amount: Optional[float] = Field(None, alias="totalAmount")
    created_at: Optional[str] = Field(None, alias="createdAt")


class BirFaturaInvoicesResponse(AppBaseModel):
    """BirFatura invoices response"""
    invoices: List[Any] = []
    pagination: Dict[str, int] = {}

class InvoiceSyncRequest(AppBaseModel):
    start_date: Optional[str] = Field(None, alias="startDate")
    end_date: Optional[str] = Field(None, alias="endDate")
    direction: Optional[str] = "incoming"

class BirfaturaResponse(AppBaseModel):
    success: bool = True
    message: Optional[str] = None
    data: Optional[Any] = None

class InvoiceSyncResponse(AppBaseModel):
    synced_count: int = 0
    incoming: int = 0
    outgoing: int = 0
    duplicates: int = 0
    errors: List[str] = []

class MockSearchRequest(AppBaseModel):
    query: Optional[str] = None

class MockDetailRequest(AppBaseModel):
    id: str

class GetOutBoxDocumentsRequest(AppBaseModel):
    """Request schema for GetOutBoxDocuments"""
    systemType: str = Field(..., description="EFATURA, EARSIV, etc.")
    documentType: str = Field(..., description="INVOICE, DESPATCHADVICE, etc.")
    startDateTime: str = Field(..., description="ISO 8601 string")
    endDateTime: str = Field(..., description="ISO 8601 string")
    invoiceNo: Optional[str] = None
    pageNumber: int = 0
    pageSize: int = 20

class GetPDFLinkRequest(AppBaseModel):
    """Request schema for GetPDFLinkByUUID"""
    uuids: List[str] = Field(..., description="List of document UUIDs")
    systemType: str = Field(..., description="EFATURA, EARSIV, etc.")


class GetEnvelopeStatusRequest(AppBaseModel):
    """Request schema for GetEnvelopeStatusFromGIB"""
    envelope_id: Optional[str] = Field(None, alias="envelopeID")
    in_out_code: Optional[str] = Field("OUT", alias="inOutCode")


class ReEnvelopeAndSendRequest(AppBaseModel):
    """Request schema for ReEnvelopeAndSend"""
    uuid: str = Field(..., description="Document or envelope UUID")


class GetCodeListByTypeRequest(AppBaseModel):
    """Request schema for GetCodeListByType"""
    code_type: int = Field(..., alias="CodeType", description="Provider code type ID")


class GetUserTagRequest(AppBaseModel):
    """Request schema for GetUserPK/GetUserGB"""
    kn: str = Field(..., description="Tax identity number")


class GibUserListRequest(AppBaseModel):
    """Request schema for GibUserList"""
    pk_gb_type_code: str = Field("PK", alias="pkGbTypeCode")
    page_number: int = Field(1, alias="pageNumber")
    page_size: int = Field(100, alias="pageSize")


class UpdateUnreadedStatusRequest(AppBaseModel):
    """Request schema for UpdateUnreadedStatus"""
    uuid: str
    system_type: str = Field("EFATURA", alias="systemType")
    document_type: str = Field("INVOICE", alias="documentType")
    in_out_code: str = Field("IN", alias="inOutCode")


class GetOutBoxDocumentByUUIDRequest(AppBaseModel):
    """Request schema for GetOutBoxDocumentByUUID"""
    uuid: str
    system_type: str = Field("EFATURA", alias="systemType")


class PreviewDocumentRequest(AppBaseModel):
    """Request schema for PreviewDocumentReturnPDF/HTML"""
    document_bytes: str = Field(..., alias="documentBytes")
    system_type_codes: str = Field("EFATURA", alias="systemTypeCodes")
