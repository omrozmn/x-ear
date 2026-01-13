from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text
from .base import db, BaseModel


class EFaturaOutbox(BaseModel):
    __tablename__ = 'efatura_outbox'

    id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_id = Column(String, nullable=True, index=True)
    replacement_id = Column(String, nullable=True, index=True)
    tenant_id = Column(String(36), db.ForeignKey('tenants.id'), nullable=False, index=True)
    file_name = Column(String, nullable=True)
    ettn = Column(String, nullable=True)
    uuid = Column(String, nullable=True)
    xml_content = Column(Text, nullable=True)
    status = Column(String, nullable=False, default='pending')  # pending, sent, error
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'invoiceId': self.invoice_id,
            'replacementId': self.replacement_id,
            'fileName': self.file_name,
            'ettn': self.ettn,
            'uuid': self.uuid,
            'status': self.status,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }
