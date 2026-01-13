from typing import Optional, List, Any, Union
from pydantic import Field, validator
from .base import AppBaseModel, IDMixin, TimestampMixin

# --- Inventory Schemas ---
class InventoryItemBase(AppBaseModel):
    name: str
    brand: str
    model: Optional[str] = None
    category: str = "hearing_aid"
    barcode: Optional[str] = None
    stock_code: Optional[str] = Field(None, alias="stockCode")
    supplier: Optional[str] = None
    unit: str = "adet"
    description: Optional[str] = None
    
    # Inventory Counts
    available_inventory: int = Field(0, alias="availableInventory")
    total_inventory: int = Field(0, alias="totalInventory")
    reorder_level: int = Field(5, alias="reorderLevel")
    
    # Pricing
    price: float = 0.0
    cost: float = 0.0
    kdv_rate: float = Field(18.0, alias="vatRate") # Primary field
    price_includes_kdv: bool = Field(False, alias="priceIncludesKdv")
    cost_includes_kdv: bool = Field(False, alias="costIncludesKdv")
    
    # Attributes
    features: List[str] = []
    direction: Optional[str] = None # left, right, both
    warranty: int = 0 # months

class InventoryItemCreate(InventoryItemBase):
    tenant_id: str = Field(..., alias="tenantId")
    branch_id: Optional[str] = Field(None, alias="branchId")
    available_serials: List[str] = Field([], alias="availableSerials")

class InventoryItemUpdate(AppBaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    available_inventory: Optional[int] = Field(None, alias="availableInventory")
    price: Optional[float] = None
    # ... allow other updates
    
class InventoryItemRead(InventoryItemBase, IDMixin, TimestampMixin):
    tenant_id: str = Field(..., alias="tenantId")
    branch_id: Optional[str] = Field(None, alias="branchId")
    
    used_inventory: int = Field(0, alias="usedInventory")
    on_trial: int = Field(0, alias="onTrial")
    
    available_serials: List[str] = Field([], alias="availableSerials")
    
    # Computed / Aliases
    vat_included_price: float = Field(0.0, alias="vatIncludedPrice")
    total_value: float = Field(0.0, alias="totalValue")
    
    # Aliases
    ear: Optional[str] = None
    kdv: Optional[float] = None # Alias for vatRate
    
    @validator("ear", always=True, pre=True)
    def set_ear_alias(cls, v, values):
        return v or values.get("direction")

    @validator("kdv", always=True, pre=True)
    def set_kdv_alias(cls, v, values):
        return v or values.get("kdv_rate")

    @validator("vat_included_price", always=True)
    def compute_vat_price(cls, v, values):
        """Compute if not present (logic mirror from model)"""
        if v: return v
        price = values.get('price', 0.0)
        rate = values.get('kdv_rate', 18.0)
        includes = values.get('price_includes_kdv', False)
        
        if includes:
            return price
        return price * (1 + rate / 100.0)

class InventoryStats(AppBaseModel):
    total_items: int = Field(0, alias="totalItems")
    low_stock: int = Field(0, alias="lowStock")
    out_of_stock: int = Field(0, alias="outOfStock")
    total_value: float = Field(0.0, alias="totalValue")

class StockMovementRead(IDMixin, TimestampMixin, AppBaseModel):
    inventory_id: str = Field(..., alias="inventoryId")
    tenant_id: str = Field(..., alias="tenantId")
    movement_type: str = Field(..., alias="movementType")
    quantity: int
    serial_number: Optional[str] = Field(None, alias="serialNumber")
    user_id: Optional[str] = Field(None, alias="userId")
    transaction_id: Optional[str] = Field(None, alias="transactionId")
    notes: Optional[str] = None
    
    # Enrichment fields (optional)
    patient_id: Optional[str] = Field(None, alias="patientId")
    patient_name: Optional[str] = Field(None, alias="patientName")
