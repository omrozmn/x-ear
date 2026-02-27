# Medical Models (formerly Patient medical models)
from sqlalchemy import Column, Boolean, Date, DateTime, ForeignKey, JSON, String, Text, Time, Index
from core.models.base import Base
from .base import db, BaseModel, gen_id, JSONMixin
from .mixins import TenantScopedMixin
import json

class PatientNote(BaseModel, TenantScopedMixin, JSONMixin):
    __tablename__ = 'patient_notes'

    # Primary key with auto-generated default
    id = Column(String(50), primary_key=True, default=lambda: gen_id("note"))
    
    # Foreign keys
    party_id = Column(String(50), ForeignKey('parties.id'), nullable=False)
    author_id = Column(String(50), nullable=False)
    appointment_id = Column(String(50))
    
    # Note details
    note_type = Column(String(20), default='clinical')
    category = Column(String(20), default='general')
    title = Column(String(200))
    content = Column(Text, nullable=False)
    is_private = Column(Boolean, default=False)

    def to_dict(self):
        base_dict = self.to_dict_base()
        note_dict = {
            'id': self.id,
            'partyId': self.party_id,
            'authorId': self.author_id,
            'appointmentId': self.appointment_id,
            'type': self.note_type,
            'category': self.category,
            'title': self.title,
            'content': self.content,
            'isPrivate': self.is_private
        }
        note_dict.update(base_dict)
        return note_dict

class EReceipt(BaseModel, TenantScopedMixin, JSONMixin):
    __tablename__ = 'ereceipts'

    # Primary key with auto-generated default
    id = Column(String(50), primary_key=True, default=lambda: gen_id("ercp"))
    
    # Foreign keys
    party_id = Column(String(50), ForeignKey('parties.id'), nullable=False)
    # tenant_id is now inherited from TenantScopedMixin
    
    # Receipt details
    receipt_number = Column(String(50), unique=True, nullable=False)
    receipt_date = Column(DateTime, nullable=False)
    doctor_name = Column(String(100))
    hospital_name = Column(String(200))
    
    # JSON fields for structured data
    materials = Column(Text)  # JSON: [{type, productCode, serial}]
    documents = Column(Text)  # JSON: [{type, url, uploadedAt}]
    
    # Status and processing
    status = Column(String(20), default='pending')
    processed_at = Column(DateTime)
    notes = Column(Text)

    @property
    def materials_json(self):
        return self.json_load(self.materials)
    
    @materials_json.setter
    def materials_json(self, value):
        self.materials = self.json_dump(value)
    
    @property
    def documents_json(self):
        return self.json_load(self.documents)
    
    @documents_json.setter
    def documents_json(self, value):
        self.documents = self.json_dump(value)

    def to_dict(self):
        base_dict = self.to_dict_base()
        ereceipt_dict = {
            'id': self.id,
            'partyId': self.party_id,
            'receiptNumber': self.receipt_number,
            'receiptDate': self.receipt_date.isoformat() if self.receipt_date else None,
            'doctorName': self.doctor_name,
            'hospitalName': self.hospital_name,
            'materials': self.materials_json,
            'documents': self.documents_json,
            'status': self.status,
            'processedAt': self.processed_at.isoformat() if self.processed_at else None,
            'notes': self.notes
        }
        ereceipt_dict.update(base_dict)
        return ereceipt_dict

class HearingTest(BaseModel, TenantScopedMixin, JSONMixin):
    __tablename__ = 'hearing_tests'

    # Primary key with auto-generated default
    id = Column(String(50), primary_key=True, default=lambda: gen_id("test"))
    
    # Foreign keys
    party_id = Column(String(50), ForeignKey('parties.id'), nullable=False)
    # tenant_id is now inherited from TenantScopedMixin
    
    # Test details
    test_date = Column(DateTime, nullable=False)
    test_type = Column(String(50), default='audiometry')
    conducted_by = Column(String(100))
    
    # Test results (JSON)
    results = Column(Text)  # JSON: {leftEar: {}, rightEar: {}, recommendations: []}
    notes = Column(Text)

    @property
    def results_json(self):
        return self.json_load(self.results)
    
    @results_json.setter
    def results_json(self, value):
        self.results = self.json_dump(value)

    def to_dict(self):
        base_dict = self.to_dict_base()
        test_dict = {
            'id': self.id,
            'partyId': self.party_id,
            'testDate': self.test_date.isoformat() if self.test_date else None,
            'testType': self.test_type,
            'conductedBy': self.conducted_by,
            'results': self.results_json,
            'notes': self.notes
        }
        test_dict.update(base_dict)
        return test_dict

    # Index suggestions
    __table_args__ = (
        Index('ix_hearing_test_patient', 'party_id'),
        Index('ix_hearing_test_date', 'test_date'),
    )