# Invoice and Proforma Models
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime
import json
from .base import db

class Invoice(db.Model):
    """Invoice model for device sales"""
    __tablename__ = 'invoices'
    
    id = Column(Integer, primary_key=True)
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    sale_id = Column(String(50), ForeignKey('sales.id'), nullable=True, index=True)  # Link to sale
    patient_id = Column(String(50), ForeignKey('patients.id'), nullable=False, index=True)
    device_id = Column(String(50), ForeignKey('devices.id'), nullable=True)
    
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
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(100))
    
    # Relationships
    patient = relationship('Patient')
    device = relationship('Device')
    sale = relationship('Sale')
    
    def to_dict(self):
        return {
            'id': self.id,
            'invoiceNumber': self.invoice_number,
            'saleId': self.sale_id,
            'patientId': self.patient_id,
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
            'createdBy': self.created_by
        }


class Proforma(db.Model):
    """Proforma (Price Quote) model"""
    __tablename__ = 'proformas'
    
    id = Column(Integer, primary_key=True)
    proforma_number = Column(String(50), unique=True, nullable=False, index=True)
    patient_id = Column(String(50), ForeignKey('patients.id'), nullable=False, index=True)
    
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
    patient = relationship('Patient', back_populates='proformas')
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
            'patientId': self.patient_id,
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
