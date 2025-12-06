# API Key Model
from .base import db, BaseModel, gen_id
import secrets

class ApiKey(BaseModel):
    __tablename__ = 'api_keys'

    id = db.Column(db.String(50), primary_key=True)
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = gen_id("key")
        if not self.key_hash:
            self.generate_key()
            
    # Key management
    name = db.Column(db.String(100), nullable=False)
    key_prefix = db.Column(db.String(10), nullable=False)
    key_hash = db.Column(db.String(255), nullable=False, index=True)
    
    # Ownership
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=False, index=True)
    created_by = db.Column(db.String(50), db.ForeignKey('users.id'))
    
    # Permissions (scopes)
    scopes = db.Column(db.Text)  # Comma-separated scopes: "read:patients,write:appointments"
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    expires_at = db.Column(db.DateTime)
    last_used_at = db.Column(db.DateTime)
    
    # Rate limiting
    rate_limit = db.Column(db.Integer, default=1000)  # Requests per hour
    
    # Transient field for displaying the key once upon creation
    _plain_key = None

    def generate_key(self):
        """Generate a new API key"""
        # Format: xear_sk_<random_32_chars>
        random_part = secrets.token_urlsafe(32)
        key = f"xear_sk_{random_part}"
        self.key_prefix = key[:10]
        
        # In a real app, we would hash this. For simplicity here, we might store it or hash it.
        # Storing hash is better security.
        from werkzeug.security import generate_password_hash
        self.key_hash = generate_password_hash(key)
        self._plain_key = key
        return key

    def check_key(self, key):
        from werkzeug.security import check_password_hash
        return check_password_hash(self.key_hash, key)

    def to_dict(self):
        base_dict = self.to_dict_base()
        key_dict = {
            'id': self.id,
            'name': self.name,
            'prefix': self.key_prefix,
            'tenantId': self.tenant_id,
            'createdBy': self.created_by,
            'scopes': self.scopes.split(',') if self.scopes else [],
            'isActive': self.is_active,
            'expiresAt': self.expires_at.isoformat() if self.expires_at else None,
            'lastUsedAt': self.last_used_at.isoformat() if self.last_used_at else None,
            'rateLimit': self.rate_limit
        }
        
        # Only include the plain key if it was just generated
        if self._plain_key:
            key_dict['apiKey'] = self._plain_key
            
        key_dict.update(base_dict)
        return key_dict
