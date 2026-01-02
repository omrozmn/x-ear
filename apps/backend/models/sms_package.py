from datetime import datetime
from models.base import db
from sqlalchemy.dialects.postgresql import JSON
import uuid

class SmsPackage(db.Model):
    __tablename__ = 'sms_packages'
    __table_args__ = {'extend_existing': True}

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(500))
    sms_count = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(3), default='TRY')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'sms_count': self.sms_count,
            'price': self.price,
            'currency': self.currency,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
