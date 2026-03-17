# Party Model (formerly Patient)
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from .base import BaseModel, gen_id, JSONMixin, LowercaseEnum
from .mixins import TenantScopedMixin
from schemas.enums import PartyStatus
from datetime import datetime

class Party(BaseModel, TenantScopedMixin, JSONMixin):
    __tablename__ = 'parties'

    # Primary key with auto-generated default
    id = Column(String(50), primary_key=True)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = gen_id("pat")
    
    # Identity fields
    tc_number = Column(String(11), unique=True, nullable=True)
    identity_number = Column(String(20), unique=False, nullable=True)
    
    # Personal information
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False, unique=True)
    email = Column(String(120))
    birth_date = Column(DateTime)
    gender = Column(String(1))
    
    # Address information
    address_city = Column(String(100))
    address_district = Column(String(100))
    address_full = Column(Text)
    
    # CRM fields - Custom type for case-insensitive enum handling
    status = Column(LowercaseEnum(PartyStatus), default=PartyStatus.ACTIVE)
    segment = Column(String(20), default='lead')
    acquisition_type = Column(String(50), default='walk-in')
    conversion_step = Column(String(50))
    referred_by = Column(String(100))
    priority_score = Column(Integer, default=0)
    branch_id = Column(String(50), ForeignKey('branches.id'), nullable=True, index=True)
    
    # JSON fields (stored as Text, accessed via properties)
    tags = Column(Text)  # JSON string
    sgk_info = Column(Text)  # JSON string
    custom_data = Column(Text)  # JSON string for documents, timeline, etc.

    # Relationships
    devices = relationship('Device', backref='party', lazy=True, cascade='all, delete-orphan')
    appointments = relationship('Appointment', backref='party', lazy=True, cascade='all, delete-orphan')
    notes = relationship('PatientNote', backref='party', lazy=True, cascade='all, delete-orphan')
    ereceipts = relationship('EReceipt', backref='party', lazy=True, cascade='all, delete-orphan')
    hearing_tests = relationship('HearingTest', backref='party', lazy=True, cascade='all, delete-orphan')
    proformas = relationship('Proforma', back_populates='party', lazy=True, cascade='all, delete-orphan')
    branch = relationship('Branch', backref='parties', lazy=True)
    
    # N:N Role Relationship (Remediation Phase 5.1)
    roles = relationship(
        'PartyRole', 
        backref='party', 
        lazy=True, 
        cascade='all, delete-orphan',
        primaryjoin="Party.id==foreign(PartyRole.party_id)"
    )

    # Remediation 5.2: Hearing Profile (1:1)
    hearing_profile = relationship(
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
        party = Party()
        party.id = data.get('id') or gen_id("pat")
        
        # Handle TC number - support both camelCase and snake_case
        # Check snake_case first (from Pydantic model_dump with by_alias=False)
        tc_number = data.get('tc_number') or data.get('tcNumber')
        party.tc_number = tc_number if tc_number and str(tc_number).strip() else None
        
        identity_number = data.get('identity_number') or data.get('identityNumber')
        party.identity_number = identity_number if identity_number and str(identity_number).strip() else None
        
        # Support both camelCase and snake_case for name fields (snake_case first)
        party.first_name = data.get('first_name') or data.get('firstName')
        party.last_name = data.get('last_name') or data.get('lastName')
        party.phone = data.get('phone')
        party.email = data.get('email')
        
        # Handle birth date - support both formats (snake_case first)
        birth_date = data.get('birth_date') or data.get('birthDate') or data.get('dob')
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
        # These take priority over nested address object (snake_case first)
        if data.get('address_city'):
            party.address_city = data.get('address_city')
        elif data.get('addressCity'):
            party.address_city = data.get('addressCity')
        elif data.get('city'):
            party.address_city = data.get('city')
            
        if data.get('address_district'):
            party.address_district = data.get('address_district')
        elif data.get('addressDistrict'):
            party.address_district = data.get('addressDistrict')
        elif data.get('district'):
            party.address_district = data.get('district')
        
        # CRM fields - use enum with proper conversion, support both cases (snake_case first)
        status_value = data.get('status', 'active')
        party.status = PartyStatus.from_legacy(status_value) if isinstance(status_value, str) else PartyStatus.ACTIVE
        party.segment = data.get('segment', 'lead')
        party.acquisition_type = data.get('acquisition_type') or data.get('acquisitionType') or 'walk-in'
        party.conversion_step = data.get('conversion_step') or data.get('conversionStep')
        party.referred_by = data.get('referred_by') or data.get('referredBy')
        party.priority_score = data.get('priority_score') or data.get('priorityScore') or 0
        party.branch_id = data.get('branch_id') or data.get('branchId')
        
        # JSON fields - support both cases (snake_case first)
        party.tags_json = data.get('tags_json') or data.get('tags') or []
        party.sgk_info_json = data.get('sgk_info_json') or data.get('sgk_info') or data.get('sgkInfo') or {
            'rightEarDevice': 'available',
            'leftEarDevice': 'available',
            'rightEarBattery': 'available',
            'leftEarBattery': 'available'
        }
        
        return party