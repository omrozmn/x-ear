from .base import db, BaseModel, gen_id, now_utc
import sqlalchemy as sa

class PartyRole(BaseModel):
    __tablename__ = 'party_roles'

    id = db.Column(db.String(50), primary_key=True)
    # Remediation 5.1: Explicit generic foreign key
    party_id = db.Column(db.String(50), db.ForeignKey('parties.id'), nullable=False, index=True)
    role_code = db.Column(db.String(20), nullable=False)
    assigned_at = db.Column(db.DateTime, default=now_utc)
    
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=True, index=True)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = gen_id("prol")
