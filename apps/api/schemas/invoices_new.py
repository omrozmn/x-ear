"""
Invoice schemas for the new invoice system.
Separate from existing schemas to avoid conflicts.
MAX 500 LOC per project rules.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from pydantic import BaseModel, Field
from schemas.base import AppBaseModel, PaginationInfo
from schemas.response import ResponseEnvelope


class InvoiceStatus(str, Enum):
    """Invoice status enumeration"""
    PENDING = "PENDING"
    RECEIVED = "RECEIVED"
    PROCESSED = "PROCESSED"
    REJECTED = "REJECTED"
    DRAFT = "DRAFT"
    SENT = "SENT"
    PAID = "PAID"
    OVERDUE = "OVERDUE"


class InvoiceType(str, Enum):
    """Invoice type enumeration"""
    INCOMING = "incoming"  # Gelen fatura (alış)
    OUTGOING = "outgoing"  # Giden fatura (satış)


class IncomingInvoiceResponse(AppBaseModel):
    """Response schema for incoming invoices (gelen faturalar)"""
    invoice_id: int = Field(..., description="Invoice ID")
    supplier_name: str = Field(..., description="Supplier name")
    supplier_tax_number: Optional[str] = Field(None, description="Supplier tax number")
    invoice_number: str = Field(..., description="Invoice number")
    invoice_date: datetime = Field(..., description="Invoice date")
    total_amount: Decimal = Field(..., description="Total amount")
    currency: str = Field(default="TRY", description="Currency code")
    status: InvoiceStatus = Field(..., description="Invoice status")
    is_converted_to_purchase: bool = Field(default=False, description="Converted to purchase")
    purchase_id: Optional[str] = Field(None, description="Related purchase ID")
    created_at: datetime = Field(..., description="Creation timestamp")


class IncomingInvoiceListResponse(AppBaseModel):
    """Response schema for incoming invoice list"""
    invoices: List[IncomingInvoiceResponse] = Field(..., description="List of invoices")
    pending_count: int = Field(..., description="Count of pending invoices")
    processed_count: int = Field(..., description="Count of processed invoices")
    pagination: PaginationInfo = Field(..., description="Pagination info")


class OutgoingInvoiceResponse(AppBaseModel):
    """Response schema for outgoing invoices (giden faturalar)"""
    invoice_id: str = Field(..., description="Invoice ID")
    party_id: str = Field(..., description="Party ID")
    party_first_name: str = Field(..., description="Party first name")
    party_last_name: str = Field(..., description="Party last name")
    invoice_number: str = Field(..., description="Invoice number")
    invoice_date: datetime = Field(..., description="Invoice date")
    due_date: Optional[datetime] = Field(None, description="Due date")
    total_amount: Decimal = Field(..., description="Total amount")
    paid_amount: Decimal = Field(default=Decimal("0"), description="Paid amount")
    status: InvoiceStatus = Field(..., description="Invoice status")
    can_create_proforma: bool = Field(default=True, description="Can create proforma")
    created_at: datetime = Field(..., description="Creation timestamp")


class OutgoingInvoiceListResponse(AppBaseModel):
    """Response schema for outgoing invoice list"""
    invoices: List[OutgoingInvoiceResponse] = Field(..., description="List of invoices")
    total_amount: Decimal = Field(..., description="Total amount")
    paid_amount: Decimal = Field(..., description="Total paid amount")
    pagination: PaginationInfo = Field(..., description="Pagination info")


class ConvertToPurchaseRequest(AppBaseModel):
    """Request schema for converting invoices to purchases"""
    invoice_ids: List[str] = Field(..., description="List of invoice IDs to convert")
    supplier_mappings: Dict[str, str] = Field(..., description="Invoice supplier ID to system supplier ID mapping")


class PurchaseData(AppBaseModel):
    """Purchase data for conversion response"""
    purchase_id: str = Field(..., description="Created purchase ID")
    supplier_id: str = Field(..., description="Supplier ID")
    supplier_name: str = Field(..., description="Supplier name")
    total_amount: Decimal = Field(..., description="Total amount")
    invoice_id: str = Field(..., description="Source invoice ID")


class SupplierMapping(AppBaseModel):
    """Supplier mapping data"""
    invoice_supplier_name: str = Field(..., description="Invoice supplier name")
    system_supplier_id: str = Field(..., description="System supplier ID")
    system_supplier_name: str = Field(..., description="System supplier name")
    is_new_supplier: bool = Field(default=False, description="Is newly created supplier")


class ProcessingError(AppBaseModel):
    """Processing error data"""
    invoice_id: str = Field(..., description="Invoice ID with error")
    error_message: str = Field(..., description="Error message")
    error_code: str = Field(..., description="Error code")


class ConvertToPurchaseResponse(AppBaseModel):
    """Response schema for invoice to purchase conversion"""
    created_purchases: List[PurchaseData] = Field(..., description="Created purchases")
    supplier_mappings: List[SupplierMapping] = Field(..., description="Supplier mappings used")
    errors: List[ProcessingError] = Field(default_factory=list, description="Processing errors")
    success_count: int = Field(..., description="Number of successful conversions")
    error_count: int = Field(..., description="Number of failed conversions")


# Note: Proformas should be created BEFORE invoices, not from them
# The concept of "ProformaFromInvoice" is incorrect in business logic


class PartySearchResult(AppBaseModel):
    """Party search result for selection"""
    party_id: str = Field(..., description="Party ID")
    first_name: str = Field(..., description="First name")
    last_name: str = Field(..., description="Last name")
    phone: Optional[str] = Field(None, description="Phone number")
    full_name: str = Field(..., description="Full name (computed)")


class InvoiceSummaryStats(AppBaseModel):
    """Invoice summary statistics"""
    incoming_total: Decimal = Field(..., description="Total incoming invoices amount")
    outgoing_total: Decimal = Field(..., description="Total outgoing invoices amount")
    pending_incoming: int = Field(..., description="Pending incoming invoices count")
    pending_outgoing: int = Field(..., description="Pending outgoing invoices count")
    monthly_incoming: Decimal = Field(..., description="This month incoming amount")
    monthly_outgoing: Decimal = Field(..., description="This month outgoing amount")


class InvoiceActionResponse(AppBaseModel):
    """Response schema for invoice accept/reject/cancel actions"""
    invoice_id: int = Field(..., description="Invoice ID")
    success: bool = Field(..., description="Whether the action succeeded")
    message: str = Field(..., description="Result message")


class InvoiceRejectRequest(AppBaseModel):
    """Request body for rejecting an invoice"""
    reason: Optional[str] = Field(None, description="Rejection reason")


class InvoiceCancelRequest(AppBaseModel):
    """Request body for cancelling an invoice"""
    reason: Optional[str] = Field(None, description="Cancellation reason")