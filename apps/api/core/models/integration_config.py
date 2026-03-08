from sqlalchemy import Column, Boolean, String, Text
from .base import BaseModel
from .mixins import TenantScopedMixin
from core.database import gen_id

class IntegrationConfig(BaseModel, TenantScopedMixin):
    """Platform-level integration configuration"""
    __tablename__ = 'integration_configs'
    
    id = Column(String(50), primary_key=True)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = gen_id("intcfg")
    
    integration_type = Column(String(50), nullable=False)  # 'vatan_sms', 'birfatura', etc.
    config_key = Column(String(100), nullable=False)
    config_value = Column(Text)
    # tenant_id is now inherited from TenantScopedMixin
    is_active = Column(Boolean, default=True)
    
    # Metadata
    description = Column(String(255))
    
    def to_dict(self):
        base_dict = self.to_dict_base()
        config_dict = {
            'id': self.id,
            'integrationType': self.integration_type,
            'configKey': self.config_key,
            'configValue': self.config_value,
            'tenantId': self.tenant_id,
            'isActive': self.is_active,
            'description': self.description
        }
        config_dict.update(base_dict)
        return config_dict
