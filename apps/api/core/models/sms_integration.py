from sqlalchemy import Column, Boolean, DateTime, Float, Integer, String, Text
from .base import BaseModel, gen_id, JSONMixin
from .mixins import TenantScopedMixin

class SMSProviderConfig(BaseModel, JSONMixin, TenantScopedMixin):
    """SMS Provider Configuration for a Tenant (VatanSMS)"""
    __tablename__ = 'sms_provider_configs'

    id = Column(String(50), primary_key=True, default=lambda: gen_id("smscfg"))
    # tenant_id is now inherited from TenantScopedMixin
    
    # VatanSMS Credentials
    api_username = Column(String(100))
    api_password = Column(String(100))
    
    # Documents submission email (VatanSMS provided)
    documents_email = Column(String(200))
    
    # Uploaded documents (JSON array of document metadata)
    documents = Column(Text)
    
    # Document submission status
    documents_submitted = Column(Boolean, default=False)
    documents_submitted_at = Column(DateTime)
    all_documents_approved = Column(Boolean, default=False)
    
    # Status
    is_active = Column(Boolean, default=True)

    @property
    def documents_json(self):
        return self.json_load(self.documents) or []
    
    @documents_json.setter
    def documents_json(self, value):
        self.documents = self.json_dump(value or [])

    def to_dict(self):
        base = self.to_dict_base()
        return {
            **base,
            'id': self.id,
            'apiUsername': self.api_username,
            'documentsEmail': self.documents_email,
            'documents': self.documents_json,
            'documentsSubmitted': self.documents_submitted,
            'documentsSubmittedAt': self.documents_submitted_at.isoformat() if self.documents_submitted_at else None,
            'allDocumentsApproved': self.all_documents_approved,
            # Do not return password
            'isActive': self.is_active
        }



class SMSHeaderRequest(BaseModel, JSONMixin, TenantScopedMixin):
    """SMS Header (Sender ID) Request"""
    __tablename__ = 'sms_header_requests'

    id = Column(String(50), primary_key=True, default=lambda: gen_id("smshdr"))
    # tenant_id is now inherited from TenantScopedMixin
    
    header_text = Column(String(11), nullable=False) # Max 11 chars
    header_type = Column(String(20), nullable=False) # company_title, trademark, domain, other
    
    # Status: pending, approved, rejected
    status = Column(String(20), default='pending')
    rejection_reason = Column(String(500))
    
    # Is this the default header for the tenant
    is_default = Column(Boolean, default=False)
    
    # Documents for this specific header (if trademark/domain)
    documents = Column(Text)
    
    @property
    def documents_json(self):
        return self.json_load(self.documents) or []
    
    @documents_json.setter
    def documents_json(self, value):
        self.documents = self.json_dump(value or [])

    def to_dict(self):
        base = self.to_dict_base()
        return {
            **base,
            'id': self.id,
            'headerText': self.header_text,
            'headerType': self.header_type,
            'status': self.status,
            'rejectionReason': self.rejection_reason,
            'isDefault': self.is_default,
            'documents': self.documents_json
        }

class SMSPackage(BaseModel, JSONMixin):
    """SMS Package available for purchase (Platform Global)"""
    __tablename__ = 'sms_packages'

    id = Column(String(50), primary_key=True, default=lambda: gen_id("smspkg"))
    name = Column(String(100), nullable=False)
    description = Column(Text)
    sms_count = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    currency = Column(String(3), default='TRY')
    is_active = Column(Boolean, default=True)

    def to_dict(self):
        base = self.to_dict_base()
        return {
            **base,
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'smsCount': self.sms_count,
            'price': self.price,
            'currency': self.currency,
            'isActive': self.is_active
        }

class TenantSMSCredit(BaseModel, JSONMixin, TenantScopedMixin):
    """Tenant's SMS Credit Balance"""
    __tablename__ = 'tenant_sms_credits'

    id = Column(String(50), primary_key=True, default=lambda: gen_id("smsbal"))
    # tenant_id is now inherited from TenantScopedMixin
    
    balance = Column(Integer, default=0)
    total_purchased = Column(Integer, default=0)
    total_used = Column(Integer, default=0)
    
    def to_dict(self):
        base = self.to_dict_base()
        return {
            **base,
            'id': self.id,
            'balance': self.balance,
            'totalPurchased': self.total_purchased,
            'totalUsed': self.total_used
        }

class TargetAudience(BaseModel, JSONMixin, TenantScopedMixin):
    """Saved Target Audience Group (e.g. from Excel)"""
    __tablename__ = 'target_audiences'

    id = Column(String(50), primary_key=True, default=lambda: gen_id("aud"))
    # tenant_id is now inherited from TenantScopedMixin
    
    name = Column(String(100), nullable=False)
    source_type = Column(String(20), default='excel') # excel, filter
    
    # If excel
    file_path = Column(String(500))
    total_records = Column(Integer, default=0)
    
    # If filter
    filter_criteria = Column(Text)
    
    @property
    def filter_criteria_json(self):
        return self.json_load(self.filter_criteria)
    
    @filter_criteria_json.setter
    def filter_criteria_json(self, value):
        self.filter_criteria = self.json_dump(value)

    def to_dict(self):
        base = self.to_dict_base()
        return {
            **base,
            'id': self.id,
            'name': self.name,
            'sourceType': self.source_type,
            'totalRecords': self.total_records,
            'filterCriteria': self.filter_criteria_json,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }
