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
    errors: List[str] = []

class MockSearchRequest(AppBaseModel):
    query: Optional[str] = None

class MockDetailRequest(AppBaseModel):
    id: str
