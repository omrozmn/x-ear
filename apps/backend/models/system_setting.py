# System Settings Model
from .base import db, BaseModel

class SystemSetting(BaseModel):
    __tablename__ = 'system_settings'
    
    key = db.Column(db.String(100), primary_key=True)
    value = db.Column(db.Text) # JSON or string
    description = db.Column(db.String(255))
    category = db.Column(db.String(50)) # general, mail, sms, maintenance
    is_public = db.Column(db.Boolean, default=False) # exposed to frontend?
    
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
