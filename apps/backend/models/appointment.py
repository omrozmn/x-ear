# Appointment Model with Improved DateTime Handling
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
    patient_id = db.Column(db.String(50), db.ForeignKey('patients.id'), nullable=False)
    clinician_id = db.Column(db.String(50))
    branch_id = db.Column(db.String(50))
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=False, index=True)
    
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
        appointment_dict = {
            'id': self.id,
            'patientId': self.patient_id,
            'clinicianId': self.clinician_id,
            'branchId': self.branch_id,
            'date': self.date.strftime('%Y-%m-%d') if self.date else None,
            'time': self.time,
            'duration': self.duration,
            'type': self.appointment_type,
            'status': self.status.value if self.status else None,
            'notes': self.notes
        }
        appointment_dict.update(base_dict)
        return appointment_dict

    # Index suggestions for future migration
    __table_args__ = (
        db.Index('ix_appointment_date', 'date'),
        db.Index('ix_appointment_patient', 'patient_id'),
        db.Index('ix_appointment_status', 'status'),
    )