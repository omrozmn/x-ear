# Device Model with Enhanced Type Safety
from .base import db, BaseModel, gen_id
from .enums import DeviceSide, DeviceStatus, DeviceCategory
from decimal import Decimal
import sqlalchemy as sa

class Device(BaseModel):
    __tablename__ = 'devices'

    # Primary key with auto-generated default
    id = db.Column(db.String(50), primary_key=True)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = gen_id("dev")

    @property
    def name(self):
        return f"{self.brand} {self.model}".strip()
    
    # Foreign keys
    tenant_id = db.Column(db.String(50), db.ForeignKey('tenants.id'), nullable=True)
    party_id = db.Column(db.String(50), db.ForeignKey('parties.id'), nullable=True)
    inventory_id = db.Column(db.String(50))
    
    # Device identification
    serial_number = db.Column(db.String(100))  # General serial number (for single ear devices)
    serial_number_left = db.Column(db.String(100))  # Left ear serial number
    serial_number_right = db.Column(db.String(100))  # Right ear serial number
    brand = db.Column(db.String(50))
    model = db.Column(db.String(100))
    device_type = db.Column(db.String(20))  # BTE, ITE, etc.
    
    # Semantic category (enum)
    # Changed to String to handle legacy data with lowercase values
    category = db.Column(db.String(50), default='HEARING_AID')
    
    # Device placement (enum)
    # Changed to String to handle legacy data
    ear = db.Column(db.String(20), default='LEFT')
    
    # Status (enum)
    # Changed to String to handle legacy data
    status = db.Column(db.String(20), default='IN_STOCK')
    
    # Trial period
    trial_start_date = db.Column(db.DateTime)
    trial_end_date = db.Column(db.DateTime)
    trial_extended_until = db.Column(db.DateTime)
    
    # Warranty information
    warranty_start_date = db.Column(db.DateTime)
    warranty_end_date = db.Column(db.DateTime)
    warranty_terms = db.Column(db.Text)
    
    # Financial (precise decimal)
    price = db.Column(sa.Numeric(12,2))  # Precise money handling
    
    # Additional information
    notes = db.Column(db.Text)

    def to_dict(self):
        base_dict = self.to_dict_base()
        device_dict = {
            'id': self.id,
            'tenantId': self.tenant_id,
            'partyId': self.party_id,
            'inventoryId': self.inventory_id,
            'serialNumber': self.serial_number,
            'serialNumberLeft': self.serial_number_left,
            'serialNumberRight': self.serial_number_right,
            'name': f"{self.brand} {self.model}".strip(),
            'brand': self.brand,
            'model': self.model,
            'type': self.device_type,
            # Safe category access for schema migrations
            'category': self.category.value if hasattr(self.category, 'value') else self.category,
            'ear': self.ear.value if hasattr(self.ear, 'value') else self.ear,
            'status': self.status.value if hasattr(self.status, 'value') else self.status,
            'trialPeriod': {
                'startDate': self.trial_start_date.isoformat() if self.trial_start_date else None,
                'endDate': self.trial_end_date.isoformat() if self.trial_end_date else None,
                'extendedUntil': self.trial_extended_until.isoformat() if self.trial_extended_until else None
            } if self.trial_start_date or self.trial_end_date else None,
            'warranty': {
                'startDate': self.warranty_start_date.isoformat() if self.warranty_start_date else None,
                'endDate': self.warranty_end_date.isoformat() if self.warranty_end_date else None,
                'terms': self.warranty_terms
            } if self.warranty_start_date or self.warranty_end_date else None,
            'price': float(self.price) if self.price else 0.0,
            # Schema compatibility fields
            'cost': 0.0,
            'kdvRate': 18.0,
            'features': [],
            'warrantyMonths': 24, # Default or calc
            'barcode': None,
            'branchId': None,
            'isAssigned': self.party_id is not None and self.party_id != 'inventory',
            'notes': self.notes
        }
        device_dict.update(base_dict)
        return device_dict

    # Index suggestions for future migration
    __table_args__ = (
        db.Index('ix_device_serial', 'serial_number'),
        db.Index('ix_device_serial_left', 'serial_number_left'),
        db.Index('ix_device_serial_right', 'serial_number_right'),
        db.Index('ix_device_category', 'category'),
        db.Index('ix_device_status', 'status'),
        db.Index('ix_device_patient', 'party_id'),
    )