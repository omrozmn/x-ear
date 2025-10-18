# Patient Model
from .base import db, BaseModel, gen_id, JSONMixin, now_utc
from .enums import PatientStatus
from datetime import datetime
import json
import sqlalchemy as sa

class Patient(BaseModel, JSONMixin):
    __tablename__ = 'patients'

    # Primary key with auto-generated default
    id = db.Column(db.String(50), primary_key=True)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = gen_id("pat")
    
    # Identity fields
    tc_number = db.Column(db.String(11), unique=True, nullable=True)
    identity_number = db.Column(db.String(20), unique=False, nullable=True)
    
    # Personal information
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False, unique=True)
    email = db.Column(db.String(120))
    birth_date = db.Column(db.DateTime)
    gender = db.Column(db.String(1))
    
    # Address information
    address_city = db.Column(db.String(100))
    address_district = db.Column(db.String(100))
    address_full = db.Column(db.Text)
    
    # CRM fields
    status = db.Column(sa.Enum(PatientStatus), default=PatientStatus.ACTIVE)
    segment = db.Column(db.String(20), default='lead')  # Keep as string for now
    acquisition_type = db.Column(db.String(50), default='walk-in')
    conversion_step = db.Column(db.String(50))
    referred_by = db.Column(db.String(100))
    priority_score = db.Column(db.Integer, default=0)
    
    # JSON fields (stored as Text, accessed via properties)
    tags = db.Column(db.Text)  # JSON string
    sgk_info = db.Column(db.Text)  # JSON string
    custom_data = db.Column(db.Text)  # JSON string for documents, timeline, etc.

    # Relationships
    devices = db.relationship('Device', backref='patient', lazy=True, cascade='all, delete-orphan')
    appointments = db.relationship('Appointment', backref='patient', lazy=True, cascade='all, delete-orphan')
    notes = db.relationship('PatientNote', backref='patient', lazy=True, cascade='all, delete-orphan')
    ereceipts = db.relationship('EReceipt', backref='patient', lazy=True, cascade='all, delete-orphan')
    hearing_tests = db.relationship('HearingTest', backref='patient', lazy=True, cascade='all, delete-orphan')
    proformas = db.relationship('Proforma', back_populates='patient', lazy=True, cascade='all, delete-orphan')

    # JSON properties for safe access
    @property
    def tags_json(self):
        return self.json_load(self.tags)
    
    @tags_json.setter
    def tags_json(self, value):
        self.tags = self.json_dump(value)
    
    @property
    def sgk_info_json(self):
        return self.json_load(self.sgk_info)
    
    @sgk_info_json.setter
    def sgk_info_json(self, value):
        self.sgk_info = self.json_dump(value)
    
    @property
    def custom_data_json(self):
        return self.json_load(self.custom_data)
    
    @custom_data_json.setter
    def custom_data_json(self, value):
        self.custom_data = self.json_dump(value)

    def to_dict(self):
        base_dict = self.to_dict_base()
        patient_dict = {
            'id': self.id,
            'tcNumber': self.tc_number,
            'identityNumber': (self.identity_number or self.tc_number),
            'firstName': self.first_name,
            'lastName': self.last_name,
            'fullName': f"{self.first_name} {self.last_name}",
            'phone': self.phone,
            'email': self.email,
            'birthDate': (lambda d: (d.isoformat() if hasattr(d, 'isoformat') else (str(d) if d is not None else None)))(self.birth_date),
            'dob': (lambda d: (d.date().isoformat() if hasattr(d, 'date') else (str(d) if d is not None else None)))(self.birth_date),
            'gender': self.gender,
            'address': {
                'city': self.address_city,
                'district': self.address_district,
                'fullAddress': self.address_full
            },
            'status': self.status.value if self.status else None,
            'segment': self.segment,
            'acquisitionType': self.acquisition_type,
            'conversionStep': self.conversion_step,
            'referredBy': self.referred_by,
            'priorityScore': self.priority_score,
            'tags': self.tags_json,
            'sgkInfo': self.sgk_info_json
        }
        patient_dict.update(base_dict)
        return patient_dict

    @staticmethod
    def from_dict(data):
        """Create Patient instance from dictionary data"""
        patient = Patient()
        patient.id = data.get('id') or gen_id("pat")
        # Handle TC number - convert empty string to None to avoid UNIQUE constraint issues
        tc_number = data.get('tcNumber')
        patient.tc_number = tc_number if tc_number and tc_number.strip() else None
        identity_number = data.get('identityNumber')
        patient.identity_number = identity_number if identity_number and identity_number.strip() else None
        patient.first_name = data.get('firstName')
        patient.last_name = data.get('lastName')
        patient.phone = data.get('phone')
        patient.email = data.get('email')
        
        # Handle birth date
        if data.get('birthDate'):
            patient.birth_date = datetime.fromisoformat(data['birthDate'])
        elif data.get('dob'):
            patient.birth_date = datetime.fromisoformat(data['dob'])
            
        patient.gender = data.get('gender')
        
        # Handle address
        address = data.get('address') or {}
        patient.address_city = address.get('city')
        patient.address_district = address.get('district')
        patient.address_full = address.get('fullAddress')
        
        # CRM fields
        status_value = data.get('status', 'active')
        if isinstance(status_value, str):
            # Convert string to enum using from_legacy method
            patient.status = PatientStatus.from_legacy(status_value)
        else:
            patient.status = status_value or PatientStatus.ACTIVE
        patient.segment = data.get('segment', 'lead')
        patient.acquisition_type = data.get('acquisitionType') or data.get('acquisition_type') or 'walk-in'
        patient.conversion_step = data.get('conversionStep') or data.get('conversion_step')
        patient.referred_by = data.get('referredBy')
        patient.priority_score = data.get('priorityScore', 0)
        
        # JSON fields
        patient.tags_json = data.get('tags', [])
        patient.sgk_info_json = data.get('sgkInfo', {
            'rightEarDevice': 'available',
            'leftEarDevice': 'available',
            'rightEarBattery': 'available',
            'leftEarBattery': 'available'
        })
        
        return patient