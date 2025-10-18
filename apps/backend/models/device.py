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
    
    # Foreign keys
    patient_id = db.Column(db.String(50), db.ForeignKey('patients.id'), nullable=True)
    inventory_id = db.Column(db.String(50))
    
    # Device identification
    serial_number = db.Column(db.String(100), unique=True)
    brand = db.Column(db.String(50))
    model = db.Column(db.String(100))
    device_type = db.Column(db.String(20))  # BTE, ITE, etc.
    
    # Semantic category (enum)
    category = db.Column(sa.Enum(DeviceCategory), default=DeviceCategory.HEARING_AID)
    
    # Device placement (enum)
    ear = db.Column(sa.Enum(DeviceSide), default=DeviceSide.LEFT)
    
    # Status (enum)
    status = db.Column(sa.Enum(DeviceStatus), default=DeviceStatus.IN_STOCK)
    
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
            'patientId': self.patient_id,
            'inventoryId': self.inventory_id,
            'serialNumber': self.serial_number,
            'brand': self.brand,
            'model': self.model,
            'type': self.device_type,
            # Safe category access for schema migrations
            'category': self.category.value if self.category else None,
            'ear': self.ear.value if self.ear else None,
            'status': self.status.value if self.status else None,
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
            'price': float(self.price) if self.price else None,
            'notes': self.notes
        }
        device_dict.update(base_dict)
        return device_dict

    # Index suggestions for future migration
    __table_args__ = (
        db.Index('ix_device_serial', 'serial_number'),
        db.Index('ix_device_category', 'category'),
        db.Index('ix_device_status', 'status'),
        db.Index('ix_device_patient', 'patient_id'),
    )