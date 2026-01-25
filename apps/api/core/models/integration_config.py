from models.base import db, BaseModel, gen_id
from .mixins import TenantScopedMixin
from datetime import datetime

class IntegrationConfig(BaseModel, TenantScopedMixin):
    """Platform-level integration configuration"""
    __tablename__ = 'integration_configs'
    
    id = db.Column(db.String(50), primary_key=True)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = gen_id("intcfg")
    
    integration_type = db.Column(db.String(50), nullable=False)  # 'vatan_sms', 'birfatura', etc.
    config_key = db.Column(db.String(100), nullable=False)
    config_value = db.Column(db.Text)
    # tenant_id is now inherited from TenantScopedMixin
    is_active = db.Column(db.Boolean, default=True)
    
    # Metadata
    description = db.Column(db.String(255))
    
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
