# Party Model (formerly Patient)
from .base import db, BaseModel, gen_id, JSONMixin, now_utc, LowercaseEnum
from .mixins import TenantScopedMixin
from .enums import PatientStatus
from datetime import datetime
import json
import sqlalchemy as sa

class Party(BaseModel, TenantScopedMixin, JSONMixin):
    __tablename__ = 'parties'

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
    
    # CRM fields - Custom type for case-insensitive enum handling
    status = db.Column(LowercaseEnum(PatientStatus), default=PatientStatus.ACTIVE)
    segment = db.Column(db.String(20), default='lead')
    acquisition_type = db.Column(db.String(50), default='walk-in')
    conversion_step = db.Column(db.String(50))
    referred_by = db.Column(db.String(100))
    priority_score = db.Column(db.Integer, default=0)
    branch_id = db.Column(db.String(50), db.ForeignKey('branches.id'), nullable=True, index=True)
    
    # JSON fields (stored as Text, accessed via properties)
    tags = db.Column(db.Text)  # JSON string
    sgk_info = db.Column(db.Text)  # JSON string
    custom_data = db.Column(db.Text)  # JSON string for documents, timeline, etc.

    # Relationships
    devices = db.relationship('Device', backref='party', lazy=True, cascade='all, delete-orphan')
    appointments = db.relationship('Appointment', backref='party', lazy=True, cascade='all, delete-orphan')
    notes = db.relationship('PatientNote', backref='party', lazy=True, cascade='all, delete-orphan')
    ereceipts = db.relationship('EReceipt', backref='party', lazy=True, cascade='all, delete-orphan')
    hearing_tests = db.relationship('HearingTest', backref='party', lazy=True, cascade='all, delete-orphan')
    proformas = db.relationship('Proforma', back_populates='party', lazy=True, cascade='all, delete-orphan')
    branch = db.relationship('Branch', backref='parties', lazy=True)
    
    # N:N Role Relationship (Remediation Phase 5.1)
    roles = db.relationship(
        'PartyRole', 
        backref='party', 
        lazy=True, 
        cascade='all, delete-orphan',
        primaryjoin="Party.id==foreign(PartyRole.party_id)"
    )

    # Remediation 5.2: Hearing Profile (1:1)
    hearing_profile = db.relationship(
        'HearingProfile',
        uselist=False,
        backref='party',
        lazy=True,
        cascade='all, delete-orphan',
        primaryjoin="Party.id==foreign(HearingProfile.party_id)"
    )

    # JSON properties for safe access
    @property
    def tags_json(self):
        val = self.json_load(self.tags)
        return val if isinstance(val, list) else []
    
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

    # Properties for Pydantic Serialization
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def branch_name(self):
        return self.branch.name if self.branch else None

    def to_dict(self):
        base_dict = self.to_dict_base()
        party_dict = {
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
            # Address fields (Flat format as per OpenAPI spec)
            'addressCity': self.address_city,
            'addressDistrict': self.address_district,
            'addressFull': self.address_full,
            'status': (self.status.value if hasattr(self.status, 'value') else (self.status or 'active')).lower(),
            'segment': self.segment,
            'acquisitionType': self.acquisition_type,
            'conversionStep': self.conversion_step,
            'referredBy': self.referred_by,
            'priorityScore': self.priority_score,
            'tenantId': self.tenant_id,
            'branchId': self.branch_id,
            'branchName': self.branch.name if self.branch else None,
            'tags': self.tags_json,
            'sgkInfo': self.sgk_info_json,
            # Remediation 5.1: Roles
            'roles': [{'code': r.role_code, 'assignedAt': r.assigned_at.isoformat() if r.assigned_at else None} for r in self.roles],
            # Remediation 5.2: Hearing Profile
            'hearingProfile': self.hearing_profile.to_dict() if self.hearing_profile else None
        }
        party_dict.update(base_dict)
        return party_dict

    @staticmethod
    def from_dict(data):
        """Create Party instance from dictionary data.
        
        Handles both camelCase (API) and snake_case (Pydantic model_dump) keys.
        """
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info('🔍 Party.from_dict - Input data keys: %s', list(data.keys()))
        logger.info('🔍 Party.from_dict - city: %s, addressCity: %s', data.get("city"), data.get("addressCity"))
        logger.info('🔍 Party.from_dict - district: %s, addressDistrict: %s', data.get("district"), data.get("addressDistrict"))
        logger.info('🔍 Party.from_dict - address: %s', data.get("address"))
        
        party = Party()
        party.id = data.get('id') or gen_id("pat")
        
        # Handle TC number - support both camelCase and snake_case
        tc_number = data.get('tcNumber') or data.get('tc_number')
        party.tc_number = tc_number if tc_number and tc_number.strip() else None
        
        identity_number = data.get('identityNumber') or data.get('identity_number')
        party.identity_number = identity_number if identity_number and identity_number.strip() else None
        
        # Support both camelCase and snake_case for name fields
        party.first_name = data.get('firstName') or data.get('first_name')
        party.last_name = data.get('lastName') or data.get('last_name')
        party.phone = data.get('phone')
        party.email = data.get('email')
        
        # Handle birth date - support both formats
        birth_date = data.get('birthDate') or data.get('birth_date') or data.get('dob')
        if birth_date:
            if isinstance(birth_date, str):
                party.birth_date = datetime.fromisoformat(birth_date)
            else:
                party.birth_date = birth_date
            
        party.gender = data.get('gender')
        
        # Handle address - can be string or dict
        address_data = data.get('address')
        if isinstance(address_data, dict):
            # Legacy dict format
            party.address_city = address_data.get('city')
            party.address_district = address_data.get('district')
            party.address_full = address_data.get('fullAddress') or address_data.get('address')
        elif isinstance(address_data, str):
            # New string format
            party.address_full = address_data
        
        # Also check for direct city/district/addressCity/addressDistrict fields
        # These take priority over nested address object
        if data.get('city'):
            party.address_city = data.get('city')
        if data.get('addressCity'):
            party.address_city = data.get('addressCity')
        if data.get('district'):
            party.address_district = data.get('district')
        if data.get('addressDistrict'):
            party.address_district = data.get('addressDistrict')
        
        import logging
        logger = logging.getLogger(__name__)
        logger.info('🔍 Party.from_dict - After processing:')
        logger.info('🔍   address_city: %s', party.address_city)
        logger.info('🔍   address_district: %s', party.address_district)
        logger.info('🔍   address_full: %s', party.address_full)
        
        # CRM fields - use enum with proper conversion, support both cases
        status_value = data.get('status', 'active')
        party.status = PatientStatus.from_legacy(status_value) if isinstance(status_value, str) else PatientStatus.ACTIVE
        party.segment = data.get('segment', 'lead')
        party.acquisition_type = data.get('acquisitionType') or data.get('acquisition_type') or 'walk-in'
        party.conversion_step = data.get('conversionStep') or data.get('conversion_step')
        party.referred_by = data.get('referredBy') or data.get('referred_by')
        party.priority_score = data.get('priorityScore') or data.get('priority_score') or 0
        party.branch_id = data.get('branchId') or data.get('branch_id')
        
        # JSON fields - support both cases
        party.tags_json = data.get('tags') or data.get('tags_json') or []
        party.sgk_info_json = data.get('sgkInfo') or data.get('sgk_info') or data.get('sgk_info_json') or {
            'rightEarDevice': 'available',
            'leftEarDevice': 'available',
            'rightEarBattery': 'available',
            'leftEarBattery': 'available'
        }
        
        return party