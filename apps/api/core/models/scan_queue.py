# Scan Queue Model (formerly Patient scan queue)
from sqlalchemy import Column, Date, DateTime, Integer, String, Text, Time
from core.models.base import Base
from .base import db, BaseModel, gen_id
from .mixins import TenantScopedMixin
from datetime import datetime

class ScanQueue(BaseModel, TenantScopedMixin):
    __tablename__ = 'scan_queue'
    
    id = Column(String(50), primary_key=True, default=lambda: gen_id('scan'))
    # tenant_id is now inherited from TenantScopedMixin
    party_id = Column(String(50), nullable=False)
    
    status = Column(String(20), default='pending') # pending, processing, completed, failed
    priority = Column(String(10), default='normal') # low, normal, high
    
    file_path = Column(String(255))
    model_path = Column(String(255))
    
    polygon_count = Column(Integer)
    render_time_ms = Column(Integer)
    
    error_message = Column(Text)
    
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    def to_dict(self):
        base = self.to_dict_base()
        d = {
            'id': self.id,
            'tenantId': self.tenant_id,
            'partyId': self.party_id,
            'status': self.status,
            'priority': self.priority,
            'filePath': self.file_path,
            'modelPath': self.model_path,
            'polygonCount': self.polygon_count,
            'renderTimeMs': self.render_time_ms,
            'errorMessage': self.error_message,
            'startedAt': self.started_at.isoformat() if self.started_at else None,
            'completedAt': self.completed_at.isoformat() if self.completed_at else None,
        }
        d.update(base)
        return d
