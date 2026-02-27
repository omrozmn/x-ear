from sqlalchemy import Column, Boolean, JSON, String, Text
from core.models.base import Base
from .base import BaseModel, gen_id
from .mixins import TenantScopedMixin
import sqlalchemy as sa

class NotificationTemplate(BaseModel, TenantScopedMixin):
    __tablename__ = 'notification_templates'

    id = Column(String(50), primary_key=True)
    # tenant_id is now inherited from TenantScopedMixin
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = gen_id("ntpl")
            
    name = Column(String(100), nullable=False, unique=True)
    description = Column(String(255))
    
    # Template content (for push/in-app notifications)
    title_template = Column(String(200))
    body_template = Column(Text)
    
    # Type (email, sms, push)
    channel = Column(String(20), default='push')
    
    # Variables used in template (comma separated)
    variables = Column(String(255))
    
    # Email-specific fields
    email_from_name = Column(String(100))
    email_from_address = Column(String(255))
    email_to_type = Column(String(20))  # 'manual', 'tenant_admins', 'platform_admins'
    email_to_addresses = Column(Text)  # JSON array for manual addresses
    email_subject = Column(String(500))
    email_body_html = Column(Text)
    email_body_text = Column(Text)
    
    # Trigger automation
    trigger_event = Column(String(100))  # 'manual', 'vatan_sms_document_uploaded', etc.
    trigger_conditions = Column(Text)  # JSON conditions
    
    # Categorization
    template_category = Column(String(50))  # 'platform_announcement', 'integration', 'operational'
    
    is_active = Column(Boolean, default=True)

    def to_dict(self):
        base_dict = self.to_dict_base()
        template_dict = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'titleTemplate': self.title_template,
            'bodyTemplate': self.body_template,
            'channel': self.channel,
            'variables': self.variables.split(',') if self.variables else [],
            'isActive': self.is_active,
            # Email fields
            'emailFromName': self.email_from_name,
            'emailFromAddress': self.email_from_address,
            'emailToType': self.email_to_type,
            'emailToAddresses': self.email_to_addresses,
            'emailSubject': self.email_subject,
            'emailBodyHtml': self.email_body_html,
            'emailBodyText': self.email_body_text,
            # Trigger fields
            'triggerEvent': self.trigger_event,
            'triggerConditions': self.trigger_conditions,
            'templateCategory': self.template_category
        }
        template_dict.update(base_dict)
        return template_dict

