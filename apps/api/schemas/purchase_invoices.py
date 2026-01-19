"""
Purchase Invoice Schemas - Pydantic models for Purchase Invoice domain
"""
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from pydantic import Field, ConfigDict
from .base import AppBaseModel, IDMixin, TimestampMixin


class PurchaseInvoiceItemRead(AppBaseModel, IDMixin):
    """Schema for reading a purchase invoice item"""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    tenant_id: str = Field(..., alias="tenantId")
    branch_id: Optional[str] = Field(None, alias="branchId")
    purchase_invoice_id: int = Field(..., alias="purchaseInvoiceId")
    product_code: Optional[str] = Field(None, alias="productCode")
    product_name: str = Field(..., alias="productName")
    product_description: Optional[str] = Field(None, alias="productDescription")
    quantity: Decimal
    unit: Optional[str] = None
    unit_price: Decimal = Field(..., alias="unitPrice")
    tax_rate: int = Field(18, alias="taxRate")
    tax_amount: Optional[Decimal] = Field(None, alias="taxAmount")
    line_total: Decimal = Field(..., alias="lineTotal")
    inventory_id: Optional[str] = Field(None, alias="inventoryId")


class PurchaseInvoiceRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading a purchase invoice"""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    tenant_id: str = Field(..., alias="tenantId")
    branch_id: Optional[str] = Field(None, alias="branchId")
    birfatura_uuid: str = Field(..., alias="birfaturaUuid")
    invoice_number: Optional[str] = Field(None, alias="invoiceNumber")
    invoice_date: datetime = Field(..., alias="invoiceDate")
    invoice_type: Optional[str] = Field("INCOMING", alias="invoiceType")
    sender_name: str = Field(..., alias="senderName")
    sender_tax_number: str = Field(..., alias="senderTaxNumber")
    sender_tax_office: Optional[str] = Field(None, alias="senderTaxOffice")
    sender_address: Optional[str] = Field(None, alias="senderAddress")
    sender_city: Optional[str] = Field(None, alias="senderCity")
    supplier_id: Optional[int] = Field(None, alias="supplierId")
    currency: Optional[str] = Field("TRY", alias="currency")
    subtotal: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = Field(None, alias="taxAmount")
    total_amount: Decimal = Field(..., alias="totalAmount")
    status: Optional[str] = Field("RECEIVED", alias="status")
    is_matched: bool = Field(False, alias="isMatched")
    notes: Optional[str] = None
    items: List[PurchaseInvoiceItemRead] = []
    
    @property
    def itemsCount(self) -> int:
        return len(self.items)
