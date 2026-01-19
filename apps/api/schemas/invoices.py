"""
Invoice Schemas - Pydantic models for Invoice domain
"""
from typing import Optional, List, Any, Dict
from datetime import datetime
from enum import Enum
from pydantic import Field
from .base import AppBaseModel, IDMixin, TimestampMixin


from schemas.efatura import EFaturaOutboxRead

class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    SENT = "sent"
    PAID = "paid"
    CANCELLED = "cancelled"
    FAILED = "failed"


class InvoiceType(str, Enum):
    SALE = "sale"
    PURCHASE = "purchase"
    REFUND = "refund"


class InvoiceItemBase(AppBaseModel):
    """Base invoice item schema"""
    description: str = Field(..., description="Item description")
    quantity: int = Field(1, description="Quantity")
    unit_price: float = Field(..., alias="unitPrice", description="Unit price")
    vat_rate: float = Field(18.0, alias="vatRate", description="VAT rate")
    discount: float = Field(0.0, description="Discount amount")
    total: float = Field(..., description="Total amount")


class InvoiceItemRead(InvoiceItemBase, IDMixin):
    """Schema for reading an invoice item"""
    invoice_id: str = Field(..., alias="invoiceId")
    product_id: Optional[str] = Field(None, alias="productId")
    product_name: Optional[str] = Field(None, alias="productName")


class InvoiceBase(AppBaseModel):
    """Base invoice schema"""
    invoice_number: Optional[str] = Field(None, alias="invoiceNumber", description="Invoice number")
    invoice_type: InvoiceType = Field(InvoiceType.SALE, alias="invoiceType", description="Invoice type")
    invoice_date: datetime = Field(default_factory=datetime.utcnow, alias="invoiceDate")
    due_date: Optional[datetime] = Field(None, alias="dueDate")
    
    # Customer/Supplier info
    customer_name: Optional[str] = Field(None, alias="customerName")
    customer_tax_number: Optional[str] = Field(None, alias="customerTaxNumber")
    customer_address: Optional[str] = Field(None, alias="customerAddress")
    
    # Amounts
    subtotal: float = Field(0.0, description="Subtotal before VAT")
    vat_amount: float = Field(0.0, alias="vatAmount", description="VAT amount")
    discount_amount: float = Field(0.0, alias="discountAmount", description="Discount amount")
    total_amount: float = Field(0.0, alias="totalAmount", description="Total amount")
    
    status: InvoiceStatus = Field(InvoiceStatus.DRAFT, description="Invoice status")
    notes: Optional[str] = Field(None, description="Notes")


class InvoiceCreate(InvoiceBase):
    """Schema for creating an invoice"""
    party_id: Optional[str] = Field(None, alias="partyId")
    sale_id: Optional[str] = Field(None, alias="saleId")
    items: List[InvoiceItemBase] = Field(default=[], description="Invoice items")


class InvoiceUpdate(AppBaseModel):
    """Schema for updating an invoice"""
    invoice_date: Optional[datetime] = Field(None, alias="invoiceDate")
    due_date: Optional[datetime] = Field(None, alias="dueDate")
    status: Optional[InvoiceStatus] = None
    notes: Optional[str] = None


class InvoiceRead(AppBaseModel, TimestampMixin):
    """Schema for reading invoice data - matches Invoice.to_dict() output"""
    id: Optional[int] = None  # Invoice uses integer ID
    invoice_number: Optional[str] = Field(None, alias="invoiceNumber")
    sale_id: Optional[str] = Field(None, alias="saleId")
    branch_id: Optional[str] = Field(None, alias="branchId")
    party_id: Optional[str] = Field(None, alias="partyId")
    device_id: Optional[str] = Field(None, alias="deviceId")
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    
    # Device info
    device_name: Optional[str] = Field(None, alias="deviceName")
    device_serial: Optional[str] = Field(None, alias="deviceSerial")
    device_price: Optional[Any] = Field(None, alias="devicePrice")  # Can be Decimal or float
    
    # Patient info (denormalized)
    party_name: Optional[str] = Field(None, alias="partyName")
    party_tc: Optional[str] = Field(None, alias="partyTC")
    
    # Status
    status: Optional[str] = None
    sent_to_gib: Optional[bool] = Field(None, alias="sentToGib")
    sent_to_gib_at: Optional[str] = Field(None, alias="sentToGibAt")
    notes: Optional[str] = None
    created_by: Optional[str] = Field(None, alias="createdBy")
    
    # E-Document fields
    edocument_status: Optional[str] = Field(None, alias="edocumentStatus")
    edocument_type: Optional[str] = Field(None, alias="edocumentType")
    ettn: Optional[str] = None
    profile_id: Optional[str] = Field(None, alias="profileId")
    invoice_type_code: Optional[str] = Field(None, alias="invoiceTypeCode")
    has_gib_pdf: Optional[bool] = Field(None, alias="hasGibPdf")
    has_gib_xml: Optional[bool] = Field(None, alias="hasGibXml")
    gib_pdf_link: Optional[str] = Field(None, alias="gibPdfLink")
    birfatura_sent_at: Optional[str] = Field(None, alias="birfaturaSentAt")
    birfatura_approved_at: Optional[str] = Field(None, alias="birfaturaApprovedAt")



class BatchInvoiceGenerateRequest(AppBaseModel):
    saleIds: List[str] = Field(..., alias="saleIds")
    invoice_type: Optional[str] = Field("standard", alias="invoiceType")
    customer_info: Optional[Dict[str, Any]] = Field(None, alias="customerInfo")

class BulkUploadResponse(AppBaseModel):
    success: bool
    created: int
    updated: int
    errors: List[Dict[str, Any]]
    request_id: Optional[str] = Field(None, alias="requestId")
    timestamp: Optional[datetime] = None

class InvoiceTemplate(AppBaseModel):
    id: str
    name: str
    description: Optional[str] = None
    fields: List[str]
    is_default: bool = Field(False, alias="isDefault")
    is_custom: bool = Field(False, alias="isCustom")
    created_at: Optional[datetime] = Field(None, alias="createdAt")
    created_by: Optional[str] = Field(None, alias="createdBy")

class InvoicePrintQueueItem(AppBaseModel):
    id: int
    invoice_number: Optional[str] = Field(None, alias="invoiceNumber")
    party_name: Optional[str] = Field(None, alias="partyName")
    amount: Optional[Any] = None
    queued_at: Optional[str] = Field(None, alias="queuedAt")
    priority: str = "normal"
    copies: int = 1
    status: Optional[str] = None

class InvoiceAddToQueueRequest(AppBaseModel):
    invoice_ids: List[int] = Field(..., alias="invoiceIds")
    priority: Optional[str] = "normal"
    copies: Optional[int] = 1

class InvoicePrintQueueResponse(AppBaseModel):
    items: List[InvoicePrintQueueItem]
    total: int
    status: str

class InvoiceIssueResponse(AppBaseModel):
    invoice: InvoiceRead
    outbox: EFaturaOutboxRead

class InvoiceCopyCancelResponse(AppBaseModel):
    copy: InvoiceRead
    cancellation: InvoiceRead

# Type aliases for frontend compatibility
Invoice = InvoiceRead
InvoiceInput = InvoiceCreate
