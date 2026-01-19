"""
E-Fatura Schemas - Pydantic models for E-Fatura domain
"""
from typing import Optional
from pydantic import Field, ConfigDict
from .base import AppBaseModel, IDMixin, TimestampMixin


class EFaturaOutboxRead(AppBaseModel, IDMixin, TimestampMixin):
    """Schema for reading an E-Fatura outbox entry"""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    invoice_id: Optional[str] = Field(None, alias="invoiceId")
    replacement_id: Optional[str] = Field(None, alias="replacementId")
    file_name: Optional[str] = Field(None, alias="fileName")
    ettn: Optional[str] = None
    uuid: Optional[str] = None
    status: str
