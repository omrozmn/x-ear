# Inventory Model for X-Ear CRM
# Manages product inventory, stock levels, and serial numbers

from datetime import datetime, timezone
import json
from .base import db, BaseModel

def now_utc():
    """Return current UTC timestamp"""
    return datetime.now(timezone.utc)


def _parse_list_field(raw):
    """Parse raw value into a Python list safely.
    Accepts JSON array strings or comma-separated values. Returns empty list on error.
    """
    if not raw:
        return []
    if isinstance(raw, list):
        return raw
    if isinstance(raw, (dict, int, float)):
        return [str(raw)]
    try:
        return json.loads(raw)
    except Exception:
        # Fallback: try comma-separated parsing
        try:
            return [s.strip() for s in str(raw).split(',') if s.strip()]
        except Exception:
            return []

# Unit types for inventory items
UNIT_TYPES = [
    # Quantity units
    'adet',  # piece
    'kutu',  # box
    'paket',  # package
    'set',  # set
    
    # Length units
    'metre',  # meter
    'santimetre',  # centimeter
    'milimetre',  # millimeter
    'kilometre',  # kilometer
    
    # Volume units
    'litre',  # liter
    'mililitre',  # milliliter
    
    # Weight units
    'kilogram',  # kilogram
    'gram',  # gram
    'ton',  # ton
    
    # Time units
    'saniye',  # second
    'dakika',  # minute
    'saat',  # hour
    'gün',  # day
    'hafta',  # week
    'ay',  # month
    'yıl',  # year
    
    # Area units
    'metrekare',  # square meter
    
    # Other
    'çift',  # pair
]


class InventoryItem(BaseModel):
    """
    Inventory model represents products in stock.
    Supports both serial-numbered items (hearing aids) and bulk items (batteries, accessories).
    """
    __tablename__ = 'inventory'

    __table_args__ = {'extend_existing': True}

    id = db.Column(db.String(50), primary_key=True)
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=False, index=True)
    branch_id = db.Column(db.String(50), db.ForeignKey('branches.id'), nullable=True, index=True)
    name = db.Column(db.String(200), nullable=False)
    brand = db.Column(db.String(100), nullable=False)
    model = db.Column(db.String(100))
    category = db.Column(db.String(50), nullable=False)  # hearing_aid, aksesuar, pil, bakim
    barcode = db.Column(db.String(100), unique=True, nullable=True)
    stock_code = db.Column(db.String(100), unique=True, nullable=True)  # Stock/SKU code
    supplier = db.Column(db.String(200))
    unit = db.Column(db.String(50), default='adet')  # Unit type (adet, metre, litre, etc.)
    description = db.Column(db.Text)
    
    # Inventory tracking
    available_inventory = db.Column(db.Integer, default=0, nullable=False)
    total_inventory = db.Column(db.Integer, default=0, nullable=False)
    used_inventory = db.Column(db.Integer, default=0, nullable=False)
    on_trial = db.Column(db.Integer, default=0, nullable=False)
    reorder_level = db.Column(db.Integer, default=5, nullable=False)
    
    # Serial numbers (JSON array for hearing aids)
    available_serials = db.Column(db.Text)  # JSON array of available serial numbers
    
    # Pricing
    price = db.Column(db.Float, nullable=False, default=0.0)
    cost = db.Column(db.Float, default=0.0)  # Cost/purchase price
    # VAT/KDV rate stored as percentage (e.g. 18 for 18%)
    # Stored as 'kdv_rate' in DB for consistency with previous migrations and schema
    kdv_rate = db.Column('kdv_rate', db.Float, default=18.0)
    # Whether the stored price and cost include VAT (KDV) already
    price_includes_kdv = db.Column('price_includes_kdv', db.Boolean, default=False)
    cost_includes_kdv = db.Column('cost_includes_kdv', db.Boolean, default=False)
    
    # Features (JSON array for all product types)
    features = db.Column(db.Text)  # JSON array of product features
    
    # Hearing aid specific fields
    direction = db.Column(db.String(10))  # left, right, both (for hearing aids)
    ear = db.Column(db.String(10))  # Alias for direction (backward compatibility)
    
    # Warranty
    warranty = db.Column(db.Integer, default=0)  # warranty in months
    
    # Relationships
    movements = db.relationship('StockMovement', back_populates='inventory', lazy='dynamic', cascade='all, delete-orphan')

    # Timestamps inherited from BaseModel

    def to_dict(self):
        """Convert inventory item to dictionary for API responses"""
        # internal wrapper uses module level parser
        def _parse_list_field(raw):
            # Returns a list for JSON array or comma-separated strings without raising
            if not raw:
                return []
            if isinstance(raw, list):
                return raw
            if isinstance(raw, (dict, int, float)):
                # Unexpected types: represent as string
                return [str(raw)]
            try:
                return json.loads(raw)
            except Exception:
                # Fallback: try comma-separated parsing
                try:
                    return [s.strip() for s in str(raw).split(',') if s.strip()]
                except Exception:
                    return []

        return {
            'id': self.id,
            'tenantId': self.tenant_id,
            'branchId': self.branch_id,
            'name': self.name,
            'brand': self.brand,
            'model': self.model,
            'category': self.category,
            'barcode': self.barcode,
            'stockCode': self.stock_code,
            'supplier': self.supplier,
            'unit': self.unit,
            'description': self.description,
            'availableInventory': self.available_inventory,
            'totalInventory': self.total_inventory,
            'usedInventory': self.used_inventory,
            'inventory': self.available_inventory,  # Legacy field
            'onTrial': self.on_trial,
            'reorderLevel': self.reorder_level,
            'minInventory': self.reorder_level,  # Legacy field
            'availableSerials': _parse_list_field(self.available_serials),
            'features': _parse_list_field(self.features),
            'price': float(self.price) if self.price is not None else 0.0,
            # Provide VAT-included price and total value for frontend convenience
            # If stored price already includes KDV, use it; otherwise apply kdv_rate.
            'vatIncludedPrice': float(self.price) if getattr(self, 'price_includes_kdv', False) else float(self.price * (1 + (getattr(self, 'kdv_rate', 0.0) / 100.0))),
            'totalValue': float((float(self.price) if getattr(self, 'price_includes_kdv', False) else float(self.price * (1 + (getattr(self, 'kdv_rate', 0.0) / 100.0)))) * (self.available_inventory or 0)),
            # Provide both aliases for backwards compatibility and OpenAPI schema
            'kdv': float(getattr(self, 'kdv_rate', None)) if getattr(self, 'kdv_rate', None) is not None else None,
            'vatRate': float(getattr(self, 'kdv_rate', None)) if getattr(self, 'kdv_rate', None) is not None else None,
            'priceIncludesKdv': bool(getattr(self, 'price_includes_kdv', False)),
            'costIncludesKdv': bool(getattr(self, 'cost_includes_kdv', False)),
            'cost': self.cost,
            'direction': self.direction or self.ear,
            'ear': self.ear or self.direction,
            'warranty': self.warranty,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }

    @staticmethod
    def from_dict(data):
        """Create inventory item from dictionary (for API requests)"""
        from uuid import uuid4
        
        inventory = InventoryItem()
        inventory.id = data.get('id') or f"item_{now_utc().strftime('%d%m%Y%H%M%S')}_{uuid4().hex[:6]}"
        inventory.name = data.get('name', '')
        inventory.brand = data.get('brand', '')
        inventory.model = data.get('model', '')
        inventory.category = data.get('category', 'hearing_aid')
        inventory.barcode = data.get('barcode')
        
        # Auto-generate stock code if missing
        stock_code = data.get('stockCode')
        if not stock_code:
            from uuid import uuid4
            stock_code = f"STK-{uuid4().hex[:8].upper()}"
        inventory.stock_code = stock_code
        
        inventory.supplier = data.get('supplier', '')
        inventory.unit = data.get('unit', 'adet')
        inventory.description = data.get('description', '')
        
        # Inventory levels - support both new and legacy field names
        inventory.available_inventory = data.get('availableInventory') or data.get('inventory', 0)
        inventory.total_inventory = data.get('totalInventory', inventory.available_inventory)
        inventory.used_inventory = data.get('usedInventory', 0)
        inventory.on_trial = data.get('onTrial', 0)
        inventory.reorder_level = data.get('reorderLevel') or data.get('minInventory', 5)
        
        # Serial numbers
        serials = data.get('availableSerials', [])
        inventory.available_serials = json.dumps(serials) if serials else None
        
        # Features
        features = data.get('features', [])
        inventory.features = json.dumps(features) if features else None
        
        # Pricing
        inventory.price = float(data.get('price', 0.0))
        inventory.cost = float(data.get('cost', 0.0))
        # VAT/KDV
        # Accept either 'kdv' or 'vatRate' from incoming payload and store into kdv_rate column
        if 'vatRate' in data:
            v = data.get('vatRate')
            if v is None or (isinstance(v, str) and str(v).strip() == ''):
                # if explicit kdv provided, prefer that; otherwise default to 18
                try:
                    inventory.kdv_rate = float(data.get('kdv', 18))
                except Exception:
                    inventory.kdv_rate = 18.0
            else:
                try:
                    inventory.kdv_rate = float(v)
                except Exception:
                    inventory.kdv_rate = 18.0
        else:
            try:
                inventory.kdv_rate = float(data.get('kdv', data.get('vatRate', 18)))
            except Exception:
                inventory.kdv_rate = 18.0

        # Price/cost include flags (frontend toggles)
        if 'priceIncludesKdv' in data:
            inventory.price_includes_kdv = bool(data.get('priceIncludesKdv'))
        elif 'price_includes_kdv' in data:
            inventory.price_includes_kdv = bool(data.get('price_includes_kdv'))
        if 'costIncludesKdv' in data:
            inventory.cost_includes_kdv = bool(data.get('costIncludesKdv'))
        elif 'cost_includes_kdv' in data:
            inventory.cost_includes_kdv = bool(data.get('cost_includes_kdv'))
        
        # Direction/ear
        inventory.direction = data.get('direction') or data.get('ear')
        inventory.ear = data.get('ear') or data.get('direction')
        
        # Warranty
        inventory.warranty = data.get('warranty', 0)
        
        return inventory

    # Provide convenient alias properties for 'kdv' and 'vat_rate' to match client expectations
    @property
    def vat_rate(self):
        return getattr(self, 'kdv_rate', None)

    @vat_rate.setter
    def vat_rate(self, value):
        self.kdv_rate = value

    @property
    def kdv(self):
        return getattr(self, 'kdv_rate', None)

    @kdv.setter
    def kdv(self, value):
        self.kdv_rate = value

    def add_serial_number(self, serial_number):
        """Add a serial number to available serials"""
        serials = []
        if self.available_serials:
            try:
                serials = json.loads(self.available_serials)
            except Exception:
                # Fallback for legacy CSV data
                serials = [s.strip() for s in str(self.available_serials).split(',') if s.strip()]
        
        if serial_number not in serials:
            serials.append(serial_number)
            self.available_serials = json.dumps(serials)
            self.available_inventory = len(serials)
            self.total_inventory = max((self.total_inventory or 0), self.available_inventory)
            return True
        return False

    def remove_serial_number(self, serial_number):
        """Remove a serial number from available serials (when assigned to patient)"""
        serials = []
        if self.available_serials:
            try:
                serials = json.loads(self.available_serials)
            except Exception:
                # Fallback for legacy CSV data
                serials = [s.strip() for s in str(self.available_serials).split(',') if s.strip()]
                
        if serial_number in serials:
            serials.remove(serial_number)
            self.available_serials = json.dumps(serials) if serials else None
            self.available_inventory = len(serials)
            self.used_inventory += 1
            return True
        return False

    def update_inventory(self, quantity_change, allow_negative=False):
        """Update inventory levels (for non-serialized items)"""
        new_available = self.available_inventory + quantity_change
        if new_available < 0 and not allow_negative:
            return False
        
        self.available_inventory = new_available
        if quantity_change < 0:
            self.used_inventory += abs(quantity_change)
        else:
            self.total_inventory += quantity_change
        
        return True

    def get_status(self):
        """Get inventory status based on current levels"""
        if self.available_inventory == 0:
            return 'out_of_stock'
        elif self.available_inventory <= self.reorder_level:
            return 'low_stock'
        elif self.on_trial > 0:
            return 'on_trial'
        else:
            return 'in_stock'
