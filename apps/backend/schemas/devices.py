"""
Device Schemas - Pydantic models for Device domain
"""
from typing import Optional, List
from datetime import datetime
from pydantic import Field
from .base import AppBaseModel, IDMixin, TimestampMixin


class DeviceBase(AppBaseModel):
    """Base device schema"""
    name: str = Field(..., description="Device name")
    brand: str = Field(..., description="Device brand")
    model: Optional[str] = Field(None, description="Device model")
    serial_number: Optional[str] = Field(None, alias="serialNumber", description="Serial number")
    barcode: Optional[str] = Field(None, description="Barcode")
    category: str = Field("hearing_aid", description="Device category")
    ear: Optional[str] = Field(None, description="Ear side: L, R, or B (both)")
    status: str = Field("available", description="Device status")
    
    # Pricing
    price: float = Field(0.0, description="Sale price")
    cost: float = Field(0.0, description="Cost price")
    kdv_rate: float = Field(18.0, alias="kdvRate", description="VAT rate")
    
    # Features
    features: List[str] = Field(default=[], description="Device features")
    warranty_months: int = Field(24, alias="warrantyMonths", description="Warranty in months")
    
    # Assignment
    patient_id: Optional[str] = Field(None, alias="patientId")
    sale_id: Optional[str] = Field(None, alias="saleId")


class DeviceCreate(AppBaseModel):
    """Schema for creating a device - matches frontend expectations"""
    patient_id: str = Field(..., alias="patientId")
    inventory_id: Optional[str] = Field(None, alias="inventoryId")
    serial_number: Optional[str] = Field(None, alias="serialNumber")
    serial_number_left: Optional[str] = Field(None, alias="serialNumberLeft")
    serial_number_right: Optional[str] = Field(None, alias="serialNumberRight")
    # Made optional - will be auto-filled from inventory if inventoryId provided
    brand: Optional[str] = Field(None, description="Device brand")
    model: Optional[str] = Field(None, description="Device model")
    type: Optional[str] = Field(None, description="Device type (e.g., hearing_aid)")
    category: Optional[str] = Field(None, description="Device category")
    ear: Optional[str] = Field(None, description="Ear side: left, right, both")
    status: Optional[str] = Field("in_stock", description="Device status")
    price: Optional[float] = Field(None, description="Sale price")
    notes: Optional[str] = Field(None, description="Notes")
    trial_period: Optional[dict] = Field(None, alias="trialPeriod")
    warranty: Optional[dict] = Field(None, description="Warranty info")


class DeviceUpdate(AppBaseModel):
    """Schema for updating a device"""
    name: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = Field(None, alias="serialNumber")
    status: Optional[str] = None
    price: Optional[float] = None
    patient_id: Optional[str] = Field(None, alias="patientId")
    sale_id: Optional[str] = Field(None, alias="saleId")


class DeviceRead(DeviceBase, IDMixin, TimestampMixin):
    """Schema for reading a device"""
    tenant_id: Optional[str] = Field(None, alias="tenantId")
    branch_id: Optional[str] = Field(None, alias="branchId")
    inventory_id: Optional[str] = Field(None, alias="inventoryId")
    
    # Computed
    is_assigned: bool = Field(False, alias="isAssigned")
    patient_name: Optional[str] = Field(None, alias="patientName")
