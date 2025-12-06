"""
Admin User model for admin panel authentication
"""
from datetime import datetime
from enum import Enum
from werkzeug.security import generate_password_hash, check_password_hash
from models.base import db

class AdminRole(str, Enum):
    """Legacy admin roles - will be replaced by AdminRoleModel"""
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
    role = db.Column(db.String(50), nullable=False, default=AdminRole.SUPPORT.value)  # Legacy field
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    mfa_enabled = db.Column(db.Boolean, default=False)
    mfa_secret = db.Column(db.String(100))
    last_login = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Note: admin_roles relationship is defined in AdminRoleModel via backref
    
    def set_password(self, password):
        """Set password hash"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check password"""
        return check_password_hash(self.password_hash, password)
    
    def get_all_permissions(self) -> set:
        """Get all permission codes from all assigned roles"""
        permissions = set()
        
        # Check if admin_roles relationship exists (new system)
        if hasattr(self, 'admin_roles'):
            for role in self.admin_roles:
                for perm in role.permissions:
                    permissions.add(perm.code)
        
        return permissions
    
    def has_permission(self, permission_code: str) -> bool:
        """Check if user has a specific permission"""
        # SuperAdmin bypass - check both legacy role and new role system
        if self.role == AdminRole.SUPER_ADMIN.value:
            return True
        
        # Check new role-based permissions
        if hasattr(self, 'admin_roles'):
            for role in self.admin_roles:
                if role.name == 'SuperAdmin':
                    return True
                if role.has_permission(permission_code):
                    return True
        
        return False
    
    def is_super_admin(self) -> bool:
        """Check if user is SuperAdmin"""
        if self.role == AdminRole.SUPER_ADMIN.value:
            return True
        
        if hasattr(self, 'admin_roles'):
            for role in self.admin_roles:
                if role.name == 'SuperAdmin':
                    return True
        
        return False
    
    def to_dict(self, include_roles=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'role': self.role,  # Legacy field
            'is_active': self.is_active,
            'mfa_enabled': self.mfa_enabled,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_super_admin': self.is_super_admin(),
        }
        
        if include_roles and hasattr(self, 'admin_roles'):
            data['roles'] = [r.to_dict() for r in self.admin_roles]
            data['permissions'] = list(self.get_all_permissions())
        
        return data
