"""
Pharmacy Service Schemas (Pydantic v2)
Full CRUD schemas for stock, dispensing, drug interactions, and stock movements.
"""
from datetime import date, datetime
from typing import Optional, List
from pydantic import Field

from hbys_common.schemas import AppBaseModel


# ---------------------------------------------------------------------------
# Pharmacy Stock
# ---------------------------------------------------------------------------

class PharmacyStockBase(AppBaseModel):
    medication_id: str = Field(..., description="Medication/drug identifier")
    lot_number: str = Field(..., description="Lot/batch number")
    barcode: Optional[str] = Field(None, description="Product barcode")
    quantity_on_hand: int = Field(0, ge=0, description="Quantity currently on hand")
    quantity_reserved: int = Field(0, ge=0, description="Quantity reserved for pending dispensing")
    unit_cost: float = Field(0.0, ge=0, description="Per-unit cost")
    expiry_date: date = Field(..., description="Expiration date")
    storage_location: Optional[str] = Field(None, description="Physical storage location")
    storage_conditions: str = Field("room_temp", description="room_temp / refrigerated / frozen")
    its_tracking_number: Optional[str] = Field(None, description="ITS karekod numarasi")
    is_narcotic: bool = Field(False, description="Whether this is a controlled/narcotic substance")
    supplier_id: Optional[str] = Field(None, description="Supplier party ID")


class PharmacyStockCreate(PharmacyStockBase):
    pass


class PharmacyStockUpdate(AppBaseModel):
    medication_id: Optional[str] = None
    lot_number: Optional[str] = None
    barcode: Optional[str] = None
    quantity_on_hand: Optional[int] = Field(None, ge=0)
    quantity_reserved: Optional[int] = Field(None, ge=0)
    unit_cost: Optional[float] = Field(None, ge=0)
    expiry_date: Optional[date] = None
    storage_location: Optional[str] = None
    storage_conditions: Optional[str] = None
    its_tracking_number: Optional[str] = None
    is_narcotic: Optional[bool] = None
    supplier_id: Optional[str] = None


class PharmacyStockRead(PharmacyStockBase):
    id: str
    quantity_available: Optional[int] = Field(None, description="Computed: on_hand - reserved")
    tenant_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Pharmacy Dispensing
# ---------------------------------------------------------------------------

class PharmacyDispensingBase(AppBaseModel):
    prescription_id: str = Field(..., description="Prescription identifier")
    prescription_item_id: Optional[str] = Field(None, description="Specific prescription item")
    patient_id: str = Field(..., description="Patient identifier")
    medication_id: str = Field(..., description="Medication identifier")
    quantity_dispensed: int = Field(..., ge=1, description="Quantity to dispense")
    lot_number: Optional[str] = Field(None, description="Lot number used")
    dispensed_by: str = Field(..., description="Pharmacist user ID")
    notes: Optional[str] = None


class PharmacyDispensingCreate(PharmacyDispensingBase):
    pass


class PharmacyDispensingUpdate(AppBaseModel):
    status: Optional[str] = Field(None, description="pending / dispensed / returned / cancelled")
    notes: Optional[str] = None
    return_reason: Optional[str] = None


class PharmacyDispensingRead(PharmacyDispensingBase):
    id: str
    dispensed_at: Optional[datetime] = None
    status: str
    return_reason: Optional[str] = None
    tenant_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ReturnRequest(AppBaseModel):
    """Schema for processing a medication return."""
    dispensing_id: str = Field(..., description="ID of the dispensing record to return")
    return_reason: str = Field(..., description="Reason for the return")
    quantity_returned: Optional[int] = Field(None, ge=1, description="Quantity returned (defaults to full)")


# ---------------------------------------------------------------------------
# Drug Interaction
# ---------------------------------------------------------------------------

class DrugInteractionBase(AppBaseModel):
    drug_a_code: str = Field(..., description="ATC or local code for drug A")
    drug_a_name: str = Field(..., description="Drug A name")
    drug_b_code: str = Field(..., description="ATC or local code for drug B")
    drug_b_name: str = Field(..., description="Drug B name")
    severity: str = Field("moderate", description="minor / moderate / major / contraindicated")
    description_tr: Optional[str] = Field(None, description="Turkish description")
    description_en: Optional[str] = Field(None, description="English description")
    clinical_effect: Optional[str] = Field(None, description="Expected clinical effect")
    management: Optional[str] = Field(None, description="Management recommendations")


class DrugInteractionCreate(DrugInteractionBase):
    pass


class DrugInteractionUpdate(AppBaseModel):
    drug_a_code: Optional[str] = None
    drug_a_name: Optional[str] = None
    drug_b_code: Optional[str] = None
    drug_b_name: Optional[str] = None
    severity: Optional[str] = None
    description_tr: Optional[str] = None
    description_en: Optional[str] = None
    clinical_effect: Optional[str] = None
    management: Optional[str] = None


class DrugInteractionRead(DrugInteractionBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class InteractionCheckRequest(AppBaseModel):
    """Check interactions for a list of drug codes."""
    drug_codes: List[str] = Field(..., min_length=2, description="List of drug ATC codes to check pairwise")


class InteractionCheckResult(AppBaseModel):
    """Single interaction finding."""
    drug_a_code: str
    drug_a_name: str
    drug_b_code: str
    drug_b_name: str
    severity: str
    description_tr: Optional[str] = None
    clinical_effect: Optional[str] = None
    management: Optional[str] = None


class InteractionCheckResponse(AppBaseModel):
    """Response from an interaction check."""
    has_interactions: bool = False
    interactions: List[InteractionCheckResult] = []
    checked_pairs: int = 0


# ---------------------------------------------------------------------------
# Stock Movement
# ---------------------------------------------------------------------------

class StockMovementBase(AppBaseModel):
    pharmacy_stock_id: str = Field(..., description="Stock item ID")
    movement_type: str = Field(..., description="purchase / dispensing / return / adjustment / expired / transfer")
    quantity: int = Field(..., description="Quantity (positive for in, negative for out)")
    reference_id: Optional[str] = Field(None, description="Reference to dispensing/purchase/etc.")
    performed_by: str = Field(..., description="User who performed the movement")
    notes: Optional[str] = None


class StockMovementCreate(StockMovementBase):
    pass


class StockMovementRead(StockMovementBase):
    id: str
    tenant_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Expiry Alert
# ---------------------------------------------------------------------------

class ExpiryAlertItem(AppBaseModel):
    stock_id: str
    medication_id: str
    lot_number: str
    quantity_on_hand: int
    expiry_date: date
    days_until_expiry: int
    storage_location: Optional[str] = None


class ExpiryAlertResponse(AppBaseModel):
    expired: List[ExpiryAlertItem] = []
    expiring_soon: List[ExpiryAlertItem] = []
    total_expired: int = 0
    total_expiring_soon: int = 0


# ---------------------------------------------------------------------------
# Narcotic Report
# ---------------------------------------------------------------------------

class NarcoticStockItem(AppBaseModel):
    stock_id: str
    medication_id: str
    lot_number: str
    quantity_on_hand: int
    quantity_reserved: int
    its_tracking_number: Optional[str] = None
    storage_location: Optional[str] = None


class NarcoticReportResponse(AppBaseModel):
    items: List[NarcoticStockItem] = []
    total_narcotic_items: int = 0


# ---------------------------------------------------------------------------
# Patient Medication History
# ---------------------------------------------------------------------------

class PatientMedicationHistoryItem(AppBaseModel):
    dispensing_id: str
    prescription_id: str
    medication_id: str
    quantity_dispensed: int
    dispensed_at: Optional[datetime] = None
    status: str
    lot_number: Optional[str] = None
    dispensed_by: str
    notes: Optional[str] = None
