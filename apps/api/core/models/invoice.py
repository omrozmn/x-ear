# Invoice and Proforma Models (formerly Patient related)
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, ForeignKey, Numeric, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import json
from .base import db, BaseModel
from .mixins import TenantScopedMixin

class Invoice(BaseModel, TenantScopedMixin):
    """Invoice model for device sales"""
    __tablename__ = 'invoices'
    
    id = Column(Integer, primary_key=True)
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    sale_id = Column(String(50), ForeignKey('sales.id'), nullable=True, index=True)  # Link to sale
    party_id = Column(String(50), ForeignKey('parties.id'), nullable=True, index=True)  # Nullable - iade faturaları, cari hesap faturaları için hasta olmayabilir
    device_id = Column(String(50), ForeignKey('devices.id'), nullable=True)
    # tenant_id is now inherited from TenantScopedMixin
    branch_id = Column(String(50), ForeignKey('branches.id'), nullable=True, index=True)
    
    # Invoice details
    device_name = Column(String(200))
    device_serial = Column(String(100))
    device_price = Column(Numeric(12,2), nullable=False)
    
    # Patient info (denormalized for historical records)
    patient_name = Column(String(200))
    patient_tc = Column(String(11))
    
    # Status and metadata
    status = Column(String(20), default='active')  # active, cancelled, refunded
    sent_to_gib = Column(Boolean, default=False)  # GİB'e gönderildi mi?
    sent_to_gib_at = Column(DateTime)  # GİB'e gönderilme tarihi
    notes = Column(Text)
    # created_at/updated_at are inherited from BaseModel but we override to keep index/nullable settings
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100))
    
    # E-Belge (Birfatura) fields
    edocument_status = Column(String(20), default='draft')  # draft, pending, approved, rejected, cancelled
    edocument_type = Column(String(20))  # EFATURA, EARSIV, EIRSALIYE, EMM, ESMM
    ettn = Column(String(100), unique=True, index=True)  # ETTN - UUID from GİB
    profile_id = Column(String(50))  # TEMELFATURA, TICARIFATURA, EARSIVFATURA
    invoice_type_code = Column(String(20))  # SATIS, IADE, TEVKIFAT, SGK, ISTISNA
    qr_code_data = Column(Text)  # QR kod verisi
    birfatura_response = Column(Text)  # JSON - birfatura yanıtı
    gib_pdf_data = Column(Text)  # GİB'den gelen PDF - base64 gzipped (from SendDocument.Result.zipped)
    gib_pdf_link = Column(String(500))  # Birfatura PDF link (from SendDocument.Result.pdfLink - may take minutes to activate)
    gib_xml_data = Column(Text)  # GİB'den gelen XML - base64 (from DocumentDownloadByUUID)
    birfatura_sent_at = Column(DateTime)  # Birfatura'ya gönderilme tarihi
    birfatura_approved_at = Column(DateTime)  # GİB onay tarihi
    
    # Extended Metadata for Birfatura/GİB
    tax_office = Column(String(100))
    return_reference_number = Column(String(100))
    return_reference_date = Column(DateTime)
    remote_message = Column(Text)  # Detailed message from Birfatura
    metadata_json = Column(JSON)  # Flexible storage for SGK, Medical, and other specialized data
    
    # Relationships
    party = relationship('Party')
    device = relationship('Device')
    sale = relationship('Sale')
    
    def to_dict(self):
        return {
            'id': self.id,
            'invoiceNumber': self.invoice_number,
            'saleId': self.sale_id,
            'branchId': self.branch_id,
            'partyId': self.party_id,
            'deviceId': self.device_id,
            'deviceName': self.device_name,
            'deviceSerial': self.device_serial,
            'devicePrice': self.device_price,
            'patientName': self.patient_name,
            'patientTC': self.patient_tc,
            'status': self.status,
            'sentToGib': self.sent_to_gib,
            'sentToGibAt': self.sent_to_gib_at.isoformat() if self.sent_to_gib_at else None,
            'notes': self.notes,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            'createdBy': self.created_by,
            'edocumentStatus': self.edocument_status,
            'edocumentType': self.edocument_type,
            'ettn': self.ettn,
            'profileId': self.profile_id,
            'invoiceTypeCode': self.invoice_type_code,
            'hasGibPdf': self.gib_pdf_data is not None,
            'hasGibXml': self.gib_xml_data is not None,
            'gibPdfLink': self.gib_pdf_link,
            'birfaturaSentAt': self.birfatura_sent_at.isoformat() if self.birfatura_sent_at else None,
            'birfaturaApprovedAt': self.birfatura_approved_at.isoformat() if self.birfatura_approved_at else None,
            'taxOffice': self.tax_office,
            'returnReferenceNumber': self.return_reference_number,
            'returnReferenceDate': self.return_reference_date.isoformat() if self.return_reference_date else None,
            'remoteMessage': self.remote_message,
            'metadata': self.metadata_json
        }


class Proforma(BaseModel, TenantScopedMixin):
    """Proforma (Price Quote) model"""
    __tablename__ = 'proformas'
    
    id = Column(Integer, primary_key=True)
    proforma_number = Column(String(50), unique=True, nullable=False, index=True)
    party_id = Column(String(50), ForeignKey('parties.id'), nullable=True, index=True)  # Nullable - cari hesap teklifleri için hasta olmayabilir
    # tenant_id is now inherited from TenantScopedMixin
    branch_id = Column(String(50), ForeignKey('branches.id'), nullable=True, index=True)
    
    # Proforma details
    company_name = Column(String(200))
    device_name = Column(String(200))
    device_serial = Column(String(100))
    device_price = Column(Numeric(12,2), nullable=False)
    devices = Column(Text)  # JSON string for device details array
    
    # Patient info (denormalized)
    patient_name = Column(String(200))
    patient_tc = Column(String(11))
    
    # Status and metadata
    status = Column(String(20), default='pending')  # pending, accepted, rejected, converted
    notes = Column(Text)
    valid_until = Column(DateTime)  # Quote expiration date
    converted_to_invoice_id = Column(Integer, ForeignKey('invoices.id'))
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100))
    
    # Relationships
    party = relationship('Party', back_populates='proformas')
    converted_invoice = relationship('Invoice', foreign_keys=[converted_to_invoice_id], backref='source_proforma')
    
    def to_dict(self):
        # Helper method for safe JSON parsing
        def json_load(text):
            try:
                return json.loads(text) if text else []
            except:
                return []
        
        return {
            'id': self.id,
            'proformaNumber': self.proforma_number,
            'branchId': self.branch_id,
            'partyId': self.party_id,
            'companyName': self.company_name,
            'deviceName': self.device_name,
            'deviceSerial': self.device_serial,
            'devicePrice': self.device_price,
            'devices': json_load(self.devices),  # Parse devices JSON
            'patientName': self.patient_name,
            'patientTC': self.patient_tc,
            'status': self.status,
            'notes': self.notes,
            'validUntil': self.valid_until.isoformat() if self.valid_until else None,
            'convertedToInvoiceId': self.converted_to_invoice_id,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            'createdBy': self.created_by
        }
