# Inventory Model for X-Ear CRM
# Manages product inventory, stock levels, and serial numbers

from datetime import datetime, timezone
import json
from .base import db

def now_utc():
    """Return current UTC timestamp"""
    return datetime.now(timezone.utc)

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


class Inventory(db.Model):
    """
    Inventory model represents products in stock.
    Supports both serial-numbered items (hearing aids) and bulk items (batteries, accessories).
    """
    __tablename__ = 'inventory'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.String(50), primary_key=True)
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
    
    # Features (JSON array for all product types)
    features = db.Column(db.Text)  # JSON array of product features
    
    # Hearing aid specific fields
    direction = db.Column(db.String(10))  # left, right, both (for hearing aids)
    ear = db.Column(db.String(10))  # Alias for direction (backward compatibility)
    
    # Warranty
    warranty = db.Column(db.Integer, default=0)  # warranty in months
    
    created_at = db.Column(db.DateTime, default=now_utc, nullable=False)
    updated_at = db.Column(db.DateTime, default=now_utc, onupdate=now_utc, nullable=False)

    def to_dict(self):
        """Convert inventory item to dictionary for API responses"""
        return {
            'id': self.id,
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
            'availableSerials': json.loads(self.available_serials) if self.available_serials else [],
            'features': json.loads(self.features) if self.features else [],
            'price': self.price,
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
        
        inventory = Inventory()
        inventory.id = data.get('id') or f"item_{now_utc().strftime('%d%m%Y%H%M%S')}_{uuid4().hex[:6]}"
        inventory.name = data.get('name', '')
        inventory.brand = data.get('brand', '')
        inventory.model = data.get('model', '')
        inventory.category = data.get('category', 'hearing_aid')
        inventory.barcode = data.get('barcode')
        inventory.stock_code = data.get('stockCode')
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
        
        # Direction/ear
        inventory.direction = data.get('direction') or data.get('ear')
        inventory.ear = data.get('ear') or data.get('direction')
        
        # Warranty
        inventory.warranty = data.get('warranty', 0)
        
        return inventory

    def add_serial_number(self, serial_number):
        """Add a serial number to available serials"""
        serials = json.loads(self.available_serials) if self.available_serials else []
        if serial_number not in serials:
            serials.append(serial_number)
            self.available_serials = json.dumps(serials)
            self.available_inventory = len(serials)
            self.total_inventory = max(self.total_inventory, self.available_inventory)
            return True
        return False

    def remove_serial_number(self, serial_number):
        """Remove a serial number from available serials (when assigned to patient)"""
        serials = json.loads(self.available_serials) if self.available_serials else []
        if serial_number in serials:
            serials.remove(serial_number)
            self.available_serials = json.dumps(serials) if serials else None
            self.available_inventory = len(serials)
            self.used_inventory += 1
            return True
        return False

    def update_inventory(self, quantity_change):
        """Update inventory levels (for non-serialized items)"""
        new_available = self.available_inventory + quantity_change
        if new_available < 0:
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
