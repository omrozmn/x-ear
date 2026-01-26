from .base import db, BaseModel, gen_id
from .mixins import TenantScopedMixin

class Lead(BaseModel, TenantScopedMixin):
    __tablename__ = 'leads'

    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id('lead'))
    # tenant_id is now inherited from TenantScopedMixin
    contact_name = db.Column(db.String(150))
    contact_phone = db.Column(db.String(50))
    contact_email = db.Column(db.String(150))
    source = db.Column(db.String(100))
    utm = db.Column(db.JSON)
    score = db.Column(db.Integer, default=0)
    status = db.Column(db.String(32), default='new')

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
