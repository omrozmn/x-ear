from sqlalchemy import Column, DateTime, ForeignKey, String
from .base import BaseModel, gen_id, now_utc
from .mixins import TenantScopedMixin

class PartyRole(BaseModel, TenantScopedMixin):
    __tablename__ = 'party_roles'

    id = Column(String(50), primary_key=True)
    # Remediation 5.1: Explicit generic foreign key
    party_id = Column(String(50), ForeignKey('parties.id'), nullable=False, index=True)
    role_code = Column(String(20), nullable=False)
    assigned_at = Column(DateTime, default=now_utc)
    
    # tenant_id is now inherited from TenantScopedMixin

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = gen_id("prol")
