"""
Invoice schemas for the new invoice system.
Separate from existing schemas to avoid conflicts.
MAX 500 LOC per project rules.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
from enum import Enum
from pydantic import Field
from schemas.base import AppBaseModel, PaginationInfo


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
    document_kind: str = Field(default="invoice", description="Document kind: invoice or despatch")
    document_kind_label: str = Field(default="E-Fatura", description="Localized document kind label")
    invoice_type_code: Optional[str] = Field(None, description="Invoice/despatch type code")
    profile_id: Optional[str] = Field(None, description="UBL profile ID")
    system_type_code: Optional[str] = Field(None, description="Provider system type code")
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
    document_kind: str = Field(default="invoice", description="Document kind: invoice or despatch")
    document_kind_label: str = Field(default="E-Fatura", description="Localized document kind label")
    invoice_type_code: Optional[str] = Field(None, description="Invoice/despatch type code")
    profile_id: Optional[str] = Field(None, description="UBL profile ID")
    system_type_code: Optional[str] = Field(None, description="Provider system type code")
    can_create_proforma: bool = Field(default=True, description="Can create proforma")
    edocument_status: Optional[str] = Field(None, description="E-document status from BirFatura (Status code)")
    has_gib_pdf: bool = Field(default=False, description="Has GIB PDF available")
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


class InvoiceProviderStatusResponse(AppBaseModel):
    """Normalized provider/GIB status for an invoice."""
    invoice_id: int = Field(..., alias="invoiceId")
    birfatura_uuid: str = Field(..., alias="birfaturaUuid")
    envelope_id: str = Field(..., alias="envelopeId")
    in_out_code: str = Field(..., alias="inOutCode")
    current_status: str = Field(..., alias="currentStatus")
    provider_status_code: Optional[str] = Field(None, alias="providerStatusCode")
    provider_message: Optional[str] = Field(None, alias="providerMessage")
    source: str = Field(default="provider")
    retryable: bool = False
    raw_result: Optional[Dict[str, Any]] = Field(None, alias="rawResult")


class InvoiceProviderActionResponse(AppBaseModel):
    """Result of a provider-side invoice action."""
    invoice_id: int = Field(..., alias="invoiceId")
    success: bool
    message: str
    provider_result: Optional[Dict[str, Any]] = Field(None, alias="providerResult")


class ReferenceCodeItemResponse(AppBaseModel):
    """Normalized provider reference code item."""
    code: str
    name: str


class TaxOfficeItemResponse(AppBaseModel):
    """Normalized provider tax office item."""
    code: str
    name: str


class RecipientCheckResponse(AppBaseModel):
    """Recipient/provider resolution summary."""
    tax_id: str = Field(..., alias="taxId")
    is_efatura_user: bool = Field(..., alias="isEfaturaUser")
    matches_found: int = Field(..., alias="matchesFound")
    default_receiver_tag: Optional[str] = Field(None, alias="defaultReceiverTag")
    receiver_tags: List[Dict[str, str]] = Field(default_factory=list, alias="receiverTags")
    recipient_name: Optional[str] = Field(None, alias="recipientName")
    identity_type: Optional[str] = Field(None, alias="identityType")
    company_title: Optional[str] = Field(None, alias="companyTitle")
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")
    tax_office: Optional[str] = Field(None, alias="taxOffice")
    identity_source: Optional[str] = Field(None, alias="identitySource")
    message: Optional[str] = None


class InvoiceDraftRequest(AppBaseModel):
    """Request body for creating or updating an invoice draft"""
    form_data: Dict[str, Any] = Field(default_factory=dict, description="Form state as JSON")


class InvoiceDraftResponse(AppBaseModel):
    """Response schema for invoice draft form data"""
    draft_id: int = Field(..., description="Draft invoice ID")
    form_data: Dict[str, Any] = Field(..., description="Form data to pre-fill the invoice form")


class SupplierInvoiceItemResponse(AppBaseModel):
    """Response schema for a single item from a supplier's invoice"""
    id: int = Field(..., description="Item ID")
    purchase_invoice_id: int = Field(..., description="Parent invoice ID")
    invoice_number: str = Field(..., description="Parent invoice number")
    invoice_date: Optional[datetime] = Field(None, description="Parent invoice date")
    product_code: Optional[str] = Field(None, description="Product code")
    product_name: str = Field(..., description="Product name")
    product_description: Optional[str] = Field(None, description="Product description")
    quantity: Decimal = Field(..., description="Quantity")
    unit: Optional[str] = Field(None, description="Unit")
    unit_price: Decimal = Field(..., description="Unit price")
    tax_rate: int = Field(default=18, description="Tax rate (%)")
    tax_amount: Optional[Decimal] = Field(None, description="Tax amount")
    line_total: Decimal = Field(..., description="Line total")
    inventory_id: Optional[str] = Field(None, description="Linked inventory item ID")


class SupplierInvoiceItemsListResponse(AppBaseModel):
    """Response schema for supplier invoice items list"""
    items: List[SupplierInvoiceItemResponse] = Field(default_factory=list, description="List of invoice items")
    total: int = Field(default=0, description="Total items count")
    supplier_name: str = Field(..., description="Supplier name")


class ProductSearchMatchedItem(AppBaseModel):
    """A single matched invoice line item for product search."""
    product_name: str = Field(..., alias="productName", description="Product name from invoice line")
    quantity: float = Field(1.0, description="Quantity on this invoice line")
    unit_price: float = Field(0.0, alias="unitPrice", description="Unit price")
    line_total: float = Field(0.0, alias="lineTotal", description="Line total amount")
    unit: Optional[str] = Field(None, description="Unit (Adet, etc.)")


class ProductSearchInvoiceResult(AppBaseModel):
    """An invoice that contains products matching a search query."""
    invoice_id: int = Field(..., alias="invoiceId", description="PurchaseInvoice DB id")
    invoice_number: str = Field(..., alias="invoiceNumber", description="Invoice number")
    invoice_date: Optional[str] = Field(None, alias="invoiceDate", description="Invoice date")
    sender_name: str = Field("", alias="senderName", description="Supplier / sender name")
    sender_tax_number: Optional[str] = Field(None, alias="senderTaxNumber", description="Supplier tax number")
    sender_address: Optional[str] = Field(None, alias="senderAddress", description="Supplier address")
    sender_city: Optional[str] = Field(None, alias="senderCity", description="Supplier city")
    matched_items: List[ProductSearchMatchedItem] = Field(
        default_factory=list, alias="matchedItems", description="Matching line items"
    )


class ProductSearchResponse(AppBaseModel):
    """Response for /incoming/search-by-product endpoint."""
    invoices: List[ProductSearchInvoiceResult] = Field(
        default_factory=list, description="Invoices containing matching products"
    )
    total: int = Field(0, description="Total invoice count")


class SupplierSuggestionItem(AppBaseModel):
    """A single supplier match suggestion."""
    supplier_id: str = Field(..., alias="supplierId", description="Matched supplier ID")
    company_name: str = Field(..., alias="companyName", description="Supplier company name")
    tax_number: Optional[str] = Field(None, alias="taxNumber", description="Supplier tax number")
    score: float = Field(..., description="Match confidence score 0-1")
    match_reason: str = Field("", alias="matchReason", description="Why this supplier matched")


class SupplierSuggestionResponse(AppBaseModel):
    """Response schema for supplier suggestion endpoint."""
    suggestions: List[SupplierSuggestionItem] = Field(default_factory=list, description="Ranked supplier suggestions")
    query: str = Field(..., description="Original query string")
