"""
Admin User model for admin panel authentication
"""
from datetime import datetime
from enum import Enum
from werkzeug.security import generate_password_hash, check_password_hash
from models.base import db

class AdminRole(str, Enum):
    """Admin roles"""
    SUPER_ADMIN = "super_admin"
    SUPPORT = "support"
    FINANCE = "finance"
    CONTENT = "content"

class AdminUser(db.Model):
    """Admin user model for admin panel"""
    __tablename__ = 'admin_users'
    
    id = db.Column(db.String(36), primary_key=True)
    email = db.Column(db.String(255), nullable=False, unique=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    role = db.Column(db.String(50), nullable=False, default=AdminRole.SUPPORT.value)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    mfa_enabled = db.Column(db.Boolean, default=False)
    mfa_secret = db.Column(db.String(100))
    last_login = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def set_password(self, password):
        """Set password hash"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check password"""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'role': self.role,
            'is_active': self.is_active,
            'mfa_enabled': self.mfa_enabled,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
