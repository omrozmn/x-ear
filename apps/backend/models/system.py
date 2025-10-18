# System Models: Settings
from .base import db, BaseModel, JSONMixin

class Settings(BaseModel, JSONMixin):
    __tablename__ = 'settings'

    # Primary key (usually single record with id='system_settings')
    id = db.Column(db.String(50), primary_key=True, default='system_settings')
    
    # Settings data as JSON
    settings_data = db.Column(db.Text, nullable=False)

    @property
    def settings_json(self):
        return self.json_load(self.settings_data)
    
    @settings_json.setter
    def settings_json(self, value):
        self.settings_data = self.json_dump(value)

    def to_dict(self):
        base_dict = self.to_dict_base()
        settings_dict = {
            'id': self.id,
            'settings': self.settings_json
        }
        settings_dict.update(base_dict)
        return settings_dict

    @staticmethod
    def get_system_settings():
        """Get or create system settings"""
        settings = db.session.get(Settings, 'system_settings')
        if not settings:
            # Create default settings
            default_settings = {
                "company": {
                    "name": "X-Ear İşitme Merkezi",
                    "address": "Atatürk Cad. No: 123, Kadıköy, İstanbul",
                    "phone": "+90 216 555 0123",
                    "email": "info@x-ear.com",
                    "taxNumber": "1234567890"
                },
                "system": {
                    "defaultBranch": ""
                },
                "notifications": {
                    "email": True,
                    "sms": True,
                    "desktop": False
                },
                "features": {
                    "integrations_ui": { "mode": "hidden", "plans": [] },
                    "pricing_ui": { "mode": "hidden", "plans": [] },
                    "security_ui": { "mode": "hidden", "plans": [] }
                }
            }
            
            settings = Settings(id='system_settings')
            settings.settings_json = default_settings
            db.session.add(settings)
            db.session.commit()
         
        return settings

    def update_setting(self, key_path, value):
        """Update a specific setting using dot notation (e.g., 'company.name')"""
        settings = self.settings_json
        keys = key_path.split('.')
        
        # Navigate to the parent object
        current = settings
        for key in keys[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]
        
        # Set the value
        current[keys[-1]] = value
        self.settings_json = settings

    def get_setting(self, key_path, default=None):
        """Get a specific setting using dot notation"""
        settings = self.settings_json
        keys = key_path.split('.')
        
        current = settings
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return default
        
        return current