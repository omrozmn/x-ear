from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, JSON, Numeric
from sqlalchemy.dialects.sqlite import DATETIME
from .base import Base


class Replacement(Base):
    __tablename__ = 'replacements'

    id = Column(String, primary_key=True)
    patient_id = Column(String, nullable=False, index=True)
    sale_id = Column(String, nullable=True, index=True)
    old_device_id = Column(String, nullable=True)
    new_device_id = Column(String, nullable=True)
    old_device_info = Column(JSON, nullable=True)
    new_device_info = Column(JSON, nullable=True)
    replacement_reason = Column(String, nullable=True)
    status = Column(String, nullable=False, default='pending', index=True)
    price_difference = Column(Numeric, nullable=True)
    return_invoice_id = Column(String, nullable=True, index=True)
    return_invoice_status = Column(String, nullable=True)
    gib_sent = Column(Boolean, default=False)
    gib_sent_date = Column(DateTime, nullable=True)
    created_by = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'patientId': self.patient_id,
            'saleId': self.sale_id,
            'oldDeviceId': self.old_device_id,
            'newDeviceId': self.new_device_id,
            'oldDeviceInfo': self.old_device_info,
            'newDeviceInfo': self.new_device_info,
            'replacementReason': self.replacement_reason,
            'status': self.status,
            'priceDifference': float(self.price_difference) if self.price_difference is not None else None,
            'returnInvoiceId': self.return_invoice_id,
            'returnInvoiceStatus': self.return_invoice_status,
            'gibSent': self.gib_sent,
            'gibSentDate': self.gib_sent_date.isoformat() if self.gib_sent_date else None,
            'createdBy': self.created_by,
            'notes': self.notes,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
