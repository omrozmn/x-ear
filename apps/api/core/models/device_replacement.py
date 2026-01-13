from .base import db, BaseModel
from datetime import datetime
import json

class DeviceReplacement(BaseModel):
    __tablename__ = 'device_replacements'
    
    id = db.Column(db.String(50), primary_key=True)
    patient_id = db.Column(db.String(50), db.ForeignKey('patients.id'), nullable=False)
    old_device_id = db.Column(db.String(50), db.ForeignKey('devices.id'), nullable=False)
    new_inventory_id = db.Column(db.String(50), nullable=False)
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=False, index=True)
    old_device_info = db.Column(db.Text)
    new_device_info = db.Column(db.Text)
    status = db.Column(db.String(50), default='pending_invoice')  # pending_invoice, invoice_created, completed
    # Timestamps inherited from BaseModel
    
    # Relationships
    return_invoice = db.relationship('ReturnInvoice', backref='replacement', uselist=False, cascade='all, delete-orphan')
    
    def to_dict(self):
        result = {
            'id': self.id,
            'patientId': self.patient_id,
            'oldDeviceId': self.old_device_id,
            'newInventoryId': self.new_inventory_id,
            'oldDeviceInfo': (json.loads(self.old_device_info) if isinstance(self.old_device_info, str) else self.old_device_info),
            'newDeviceInfo': (json.loads(self.new_device_info) if isinstance(self.new_device_info, str) else self.new_device_info),
            'status': self.status,
            'date': self.created_at.isoformat() if self.created_at else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
        
        # Include return invoice info if exists
        if self.return_invoice:
            result['invoiceId'] = self.return_invoice.id
            result['invoiceNumber'] = self.return_invoice.invoice_number
            result['supplierName'] = self.return_invoice.supplier_name
            result['originalInvoiceNumber'] = self.return_invoice.supplier_invoice_number
            result['returnInvoiceNote'] = self.return_invoice.invoice_note
            result['gibSent'] = self.return_invoice.gib_sent
            result['gibSentDate'] = self.return_invoice.gib_sent_date.isoformat() if self.return_invoice.gib_sent_date else None
            result['invoiceCreatedDate'] = self.return_invoice.created_at.isoformat() if self.return_invoice.created_at else None
        
        return result


class ReturnInvoice(BaseModel):
    __tablename__ = 'return_invoices'
    
    id = db.Column(db.String(50), primary_key=True)
    replacement_id = db.Column(db.String(50), db.ForeignKey('device_replacements.id'), nullable=False)
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=False, index=True)
    invoice_number = db.Column(db.String(100), nullable=False)
    supplier_name = db.Column(db.String(255))
    supplier_invoice_id = db.Column(db.String(50))
    supplier_invoice_number = db.Column(db.String(100))
    supplier_invoice_date = db.Column(db.Date)
    invoice_note = db.Column(db.Text)
    gib_sent = db.Column(db.Boolean, default=False)
    gib_sent_date = db.Column(db.DateTime)
    # Timestamps inherited from BaseModel
    
    def to_dict(self):
        return {
            'id': self.id,
            'replacementId': self.replacement_id,
            'invoiceNumber': self.invoice_number,
            'supplierName': self.supplier_name,
            'supplierInvoiceId': self.supplier_invoice_id,
            'supplierInvoiceNumber': self.supplier_invoice_number,
            'supplierInvoiceDate': self.supplier_invoice_date.isoformat() if self.supplier_invoice_date else None,
            'invoiceNote': self.invoice_note,
            'gibSent': self.gib_sent,
            'gibSentDate': self.gib_sent_date.isoformat() if self.gib_sent_date else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
