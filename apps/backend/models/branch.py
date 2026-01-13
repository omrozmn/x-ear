from .base import db, BaseModel, gen_id
from sqlalchemy import Column, String, ForeignKey

class Branch(BaseModel):
    """Branch model for managing tenant branches/locations"""
    __tablename__ = 'branches'

    id = Column(String(50), primary_key=True, default=lambda: gen_id("br"))
    tenant_id = Column(String(36), ForeignKey('tenants.id'), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    address = Column(String(255))
    phone = Column(String(20))
    email = Column(String(100))
    
    def to_dict(self):
        base_dict = self.to_dict_base()
        branch_dict = {
            'id': self.id,
            'tenantId': self.tenant_id,
            'name': self.name,
            'address': self.address,
            'phone': self.phone,
            'email': self.email,
            # Default values for optional fields
            'code': None,
            'city': None,
            'district': None,
            'isActive': True,
            'isMain': False,
            'userCount': 0,
            'patientCount': 0,
        }
        branch_dict.update(base_dict)
        return branch_dict
