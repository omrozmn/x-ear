# Cargo Integration Model - Shipping provider connections
from sqlalchemy import Column, Boolean, String, Text
from .base import BaseModel, gen_id
from .mixins import TenantScopedMixin


class CargoIntegration(BaseModel, TenantScopedMixin):
    __tablename__ = 'cargo_integrations'

    id = Column(String(50), primary_key=True)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = gen_id("crg")

    platform = Column(String(50), nullable=False)  # yurtici/aras/mng/surat/ptt
    name = Column(String(100))  # Display name

    # Credentials
    api_key = Column(String(255))
    api_secret = Column(String(255))
    customer_id = Column(String(100))  # Cargo company customer number
    other_params = Column(Text)  # JSON for extra parameters

    is_active = Column(Boolean, default=True)
    status = Column(String(20), default='disconnected')  # connected/error/disconnected

    def to_dict(self):
        base_dict = self.to_dict_base()
        cargo_dict = {
            'id': self.id,
            'platform': self.platform,
            'name': self.name,
            'customerId': self.customer_id,
            'isActive': self.is_active,
            'status': self.status,
        }
        cargo_dict.update(base_dict)
        return cargo_dict
