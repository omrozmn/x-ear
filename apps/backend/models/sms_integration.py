from .base import db, BaseModel, gen_id, JSONMixin
from datetime import datetime, timezone

class SMSProviderConfig(BaseModel, JSONMixin):
    """SMS Provider Configuration for a Tenant (VatanSMS)"""
    __tablename__ = 'sms_provider_configs'

    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id("smscfg"))
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=False, unique=True, index=True)
    
    # VatanSMS Credentials
    api_username = db.Column(db.String(100))
    api_password = db.Column(db.String(100))
    
    # Documents submission email (VatanSMS provided)
    documents_email = db.Column(db.String(200))
    
    # Uploaded documents (JSON array of document metadata)
    documents = db.Column(db.Text)
    
    # Document submission status
    documents_submitted = db.Column(db.Boolean, default=False)
    documents_submitted_at = db.Column(db.DateTime)
    all_documents_approved = db.Column(db.Boolean, default=False)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)

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
            'tenantId': self.tenant_id,
            'apiUsername': self.api_username,
            'documentsEmail': self.documents_email,
            'documents': self.documents_json,
            'documentsSubmitted': self.documents_submitted,
            'documentsSubmittedAt': self.documents_submitted_at.isoformat() if self.documents_submitted_at else None,
            'allDocumentsApproved': self.all_documents_approved,
            # Do not return password
            'isActive': self.is_active
        }



class SMSHeaderRequest(BaseModel, JSONMixin):
    """SMS Header (Sender ID) Request"""
    __tablename__ = 'sms_header_requests'

    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id("smshdr"))
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=False, index=True)
    
    header_text = db.Column(db.String(11), nullable=False) # Max 11 chars
    header_type = db.Column(db.String(20), nullable=False) # company_title, trademark, domain, other
    
    # Status: pending, approved, rejected
    status = db.Column(db.String(20), default='pending')
    rejection_reason = db.Column(db.String(500))
    
    # Is this the default header for the tenant
    is_default = db.Column(db.Boolean, default=False)
    
    # Documents for this specific header (if trademark/domain)
    documents = db.Column(db.Text)
    
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
            'tenantId': self.tenant_id,
            'headerText': self.header_text,
            'headerType': self.header_type,
            'status': self.status,
            'rejectionReason': self.rejection_reason,
            'isDefault': self.is_default,
            'documents': self.documents_json
        }

class SMSPackage(BaseModel, JSONMixin):
    """SMS Package available for purchase"""
    __tablename__ = 'sms_packages'

    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id("smspkg"))
    
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    sms_count = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(3), default='TRY')
    
    is_active = db.Column(db.Boolean, default=True)
    
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

class TenantSMSCredit(BaseModel, JSONMixin):
    """Tenant's SMS Credit Balance"""
    __tablename__ = 'tenant_sms_credits'

    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id("smsbal"))
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=False, unique=True, index=True)
    
    balance = db.Column(db.Integer, default=0)
    total_purchased = db.Column(db.Integer, default=0)
    total_used = db.Column(db.Integer, default=0)
    
    def to_dict(self):
        base = self.to_dict_base()
        return {
            **base,
            'id': self.id,
            'tenantId': self.tenant_id,
            'balance': self.balance,
            'totalPurchased': self.total_purchased,
            'totalUsed': self.total_used
        }

class TargetAudience(BaseModel, JSONMixin):
    """Saved Target Audience Group (e.g. from Excel)"""
    __tablename__ = 'target_audiences'

    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id("aud"))
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=False, index=True)
    
    name = db.Column(db.String(100), nullable=False)
    source_type = db.Column(db.String(20), default='excel') # excel, filter
    
    # If excel
    file_path = db.Column(db.String(500))
    total_records = db.Column(db.Integer, default=0)
    
    # If filter
    filter_criteria = db.Column(db.Text)
    
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
            'tenantId': self.tenant_id,
            'name': self.name,
            'sourceType': self.source_type,
            'totalRecords': self.total_records,
            'filterCriteria': self.filter_criteria_json,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }
