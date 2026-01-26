from typing import Optional, List, Any, Union, Dict
from pydantic import Field, field_validator, ValidationInfo, model_validator
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
    kdv_rate: float = Field(20.0, alias="vatRate") # Primary field
    price_includes_kdv: bool = Field(False, alias="priceIncludesKdv")
    cost_includes_kdv: bool = Field(False, alias="costIncludesKdv")
    
    # Attributes
    features: List[str] = Field(default_factory=list)
    direction: Optional[str] = None # left, right, both
    warranty: int = 0 # months

class InventoryItemCreate(InventoryItemBase):
    tenant_id: Optional[str] = Field(None, alias="tenantId")
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
    
    available_serials: List[str] = Field(default_factory=list, alias="availableSerials")
    
    # Computed / Aliases
    vat_included_price: float = Field(0.0, alias="vatIncludedPrice")
    total_value: float = Field(0.0, alias="totalValue")
    
    # Aliases
    ear: Optional[str] = None
    
    @field_validator('features', 'available_serials', mode='before')
    @classmethod
    def ensure_list(cls, v):
        """Convert None to empty list or parse JSON string to list"""
        if v is None:
            return []
        if isinstance(v, str) and v.startswith('['):
            import json
            try:
                return json.loads(v)
            except:
                return [v]
        return v
    kdv: Optional[float] = None # Alias for vatRate
    
    @field_validator("ear", mode="before")
    @classmethod
    def set_ear_alias(cls, v, info: ValidationInfo):
        if v is not None:
             return v
        return info.data.get("direction")

    @field_validator("kdv", mode="before")
    @classmethod
    def set_kdv_alias(cls, v, info: ValidationInfo):
        if v is not None:
             return v
        return info.data.get("kdv_rate")

    @model_validator(mode='after')
    def compute_fields(self):
        # Compute vat_included_price
        if not self.vat_included_price or self.vat_included_price == 0.0:
            price = self.price or 0.0
            rate = self.kdv_rate or 20.0
            includes = self.price_includes_kdv
            
            if includes:
                self.vat_included_price = price
            else:
                self.vat_included_price = price * (1 + rate / 100.0)
        
        # Ensure aliases for ear and kdv are set if missing (though field_validators should handle this)
        # But 'mode=before' field validators run on input dict/object retrieval.
        return self

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
    party_id: Optional[str] = Field(None, alias="partyId")
    party_name: Optional[str] = Field(None, alias="partyName")

class InventoryFilterOptions(AppBaseModel):
    categories: List[str]
    brands: List[str]
    suppliers: List[str]
    price_range: Dict[str, float] = Field(..., alias="priceRange")

class InventoryPagination(AppBaseModel):
    page: int
    limit: int
    total: int
    total_pages: int = Field(..., alias="totalPages")

class InventorySearchResponse(AppBaseModel):
    items: List[InventoryItemRead]
    pagination: InventoryPagination
    filters: InventoryFilterOptions
