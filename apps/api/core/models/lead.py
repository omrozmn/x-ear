from sqlalchemy import Column, Integer, JSON, String
from core.models.base import Base
from .base import db, BaseModel, gen_id
from .mixins import TenantScopedMixin

class Lead(BaseModel, TenantScopedMixin):
    __tablename__ = 'leads'

    id = Column(String(50), primary_key=True, default=lambda: gen_id('lead'))
    # tenant_id is now inherited from TenantScopedMixin
    contact_name = Column(String(150))
    contact_phone = Column(String(50))
    contact_email = Column(String(150))
    source = Column(String(100))
    utm = Column(JSON)
    score = Column(Integer, default=0)
    status = Column(String(32), default='new')

    def to_dict(self):
        base = self.to_dict_base()
        d = {
            'id': self.id,
            'tenantId': self.tenant_id,
            'contactName': self.contact_name,
            'contactPhone': self.contact_phone,
            'contactEmail': self.contact_email,
            'source': self.source,
            'utm': self.utm,
            'score': self.score,
            'status': self.status,
        }
        d.update(base)
        return d
