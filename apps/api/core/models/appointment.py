# Appointment Models (formerly Patient appointment models)
from .base import db, BaseModel, gen_id
from .enums import AppointmentStatus
import sqlalchemy as sa

class Appointment(BaseModel):
    __tablename__ = 'appointments'

    # Primary key with auto-generated default
    id = db.Column(db.String(50), primary_key=True)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = gen_id("apt")
    
    # Foreign keys
    party_id = db.Column(db.String(50), db.ForeignKey('parties.id'), nullable=False)
    clinician_id = db.Column(db.String(50))
    branch_id = db.Column(db.String(50))
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=False, index=True)

    __table_args__ = (
        sa.UniqueConstraint('tenant_id', 'clinician_id', 'date', 'time', name='uq_appointment_slot'),
    )
    
    # DateTime fields (will be consolidated to start_at in future)
    date = db.Column(db.DateTime, nullable=False)
    time = db.Column(db.String(10), nullable=False)
    duration = db.Column(db.Integer, default=30)  # minutes
    
    # Appointment details
    appointment_type = db.Column(db.String(30), default='consultation')
    status = db.Column(sa.Enum(AppointmentStatus), default=AppointmentStatus.SCHEDULED)
    notes = db.Column(db.Text)
    
    def __setattr__(self, name, value):
        """Override setattr to handle status conversion"""
        if name == 'status' and value is not None:
            if isinstance(value, str):
                # Convert string values using from_legacy method
                value = AppointmentStatus.from_legacy(value)
        super().__setattr__(name, value)

    def to_dict(self):
        base_dict = self.to_dict_base()
        
        # Fetch party name if available
        party_name = None
        if self.party_id:
            try:
                # Use relationship backref (defined in Party model as backref='party')
                if self.party:
                     party_name = f"{self.party.first_name or ''} {self.party.last_name or ''}".strip() or 'Bilgi yok'
            except Exception:
                party_name = 'Bilgi yok'
        
        # Normalize appointment_type to valid enum values
        apt_type = self.appointment_type or 'consultation'
        type_mapping = {
            'checkup': 'control',
            'check-up': 'control',
            'follow-up': 'control',
            'followup': 'control',
            'fitting': 'device_fitting',
            'trial': 'device_trial',
            'test': 'hearing_test',
        }
        normalized_type = type_mapping.get(apt_type.lower(), apt_type.lower())
        # Validate against known types
        valid_types = ['consultation', 'hearing_test', 'device_trial', 'device_fitting', 'control', 'repair', 'other']
        if normalized_type not in valid_types:
            normalized_type = 'other'
        
        # Format status to lowercase for schema compatibility
        status_value = self.status.value.lower() if self.status else 'scheduled'
        
        # Format date as ISO datetime string for Pydantic datetime field  
        date_iso = self.date.isoformat() if self.date else None
        
        appointment_dict = {
            'id': self.id,
            'tenantId': self.tenant_id,  # Required by AppointmentRead schema
            'partyId': self.party_id,
            'partyName': party_name,
            'clinicianId': self.clinician_id,
            'branchId': self.branch_id,
            'date': date_iso,
            'time': self.time,
            'duration': self.duration,
            'appointmentType': normalized_type,
            'type': normalized_type,
            'status': status_value,
            'notes': self.notes
        }
        appointment_dict.update(base_dict)
        return appointment_dict

    # Index suggestions for future migration
    __table_args__ = (
        db.Index('ix_appointment_date', 'date'),
        db.Index('ix_appointment_patient', 'party_id'),
        db.Index('ix_appointment_status', 'status'),
    )