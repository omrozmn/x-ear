# System Settings Model
from sqlalchemy import Column, Boolean, String, Text
from .base import BaseModel

class SystemSetting(BaseModel):
    __tablename__ = 'system_settings'
    
    key = Column(String(100), primary_key=True)
    value = Column(Text) # JSON or string
    description = Column(String(255))
    category = Column(String(50)) # general, mail, sms, maintenance
    is_public = Column(Boolean, default=False) # exposed to frontend?
    
    def to_dict(self):
        base_dict = self.to_dict_base()
        setting_dict = {
            'key': self.key,
            'value': self.value,
            'description': self.description,
            'category': self.category,
            'isPublic': self.is_public
        }
        setting_dict.update(base_dict)
        return setting_dict
