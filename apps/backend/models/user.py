# User and Activity Models
from .base import db, BaseModel, gen_id, JSONMixin
from werkzeug.security import generate_password_hash, check_password_hash
import json

# Association table for User-Branch many-to-many relationship
user_branches = db.Table('user_branches',
    db.Column('user_id', db.String(50), db.ForeignKey('users.id'), primary_key=True),
    db.Column('branch_id', db.String(50), db.ForeignKey('branches.id'), primary_key=True)
)

class User(BaseModel):
    __tablename__ = 'users'

    # Primary key with auto-generated default
    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id("usr"))
    
    # Authentication
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20), unique=True, nullable=True)
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    
    # User details
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    role = db.Column(db.String(20), default='user')
    is_active = db.Column(db.Boolean, default=True)
    is_phone_verified = db.Column(db.Boolean, default=False)
    
    # Relationships
    branches = db.relationship('Branch', secondary=user_branches, lazy='subquery',
        backref=db.backref('users', lazy=True))
    
    # Future fields for enhancement
    last_login = db.Column(db.DateTime)
    password_reset_token = db.Column(db.String(100))
    password_reset_expires = db.Column(db.DateTime)

    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Check password against hash"""
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        base_dict = self.to_dict_base()
        user_dict = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'firstName': self.first_name,
            'lastName': self.last_name,
            'fullName': f"{self.first_name} {self.last_name}" if self.first_name and self.last_name else self.username,
            'role': self.role,
            'phone': self.phone,
            'isPhoneVerified': self.is_phone_verified,
            'isActive': self.is_active,
            'branches': [branch.to_dict() for branch in self.branches],
            'lastLogin': self.last_login.isoformat() if self.last_login else None
        }
        user_dict.update(base_dict)
        return user_dict

class ActivityLog(BaseModel, JSONMixin):
    __tablename__ = 'activity_logs'

    # Primary key with auto-generated default
    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id("log"))
    
    # Activity details
    user_id = db.Column(db.String(50), nullable=False)  # Could be nullable for system actions
    action = db.Column(db.String(50), nullable=False)
    entity_type = db.Column(db.String(50), nullable=False)
    entity_id = db.Column(db.String(50))
    
    # Request details
    ip_address = db.Column(db.String(45))  # IPv6 support
    user_agent = db.Column(db.Text)
    
    # Additional data (JSON)
    details = db.Column(db.Text)  # JSON string

    @property
    def details_json(self):
        return self.json_load(self.details)
    
    @details_json.setter
    def details_json(self, value):
        self.details = self.json_dump(value)

    def to_dict(self):
        base_dict = self.to_dict_base()
        log_dict = {
            'id': self.id,
            'userId': self.user_id,
            'action': self.action,
            'entityType': self.entity_type,
            'entityId': self.entity_id,
            'ipAddress': self.ip_address,
            'userAgent': self.user_agent,
            'details': self.details_json
        }
        log_dict.update(base_dict)
        return log_dict

    # Index suggestions for performance
    __table_args__ = (
        db.Index('ix_activity_user', 'user_id'),
        db.Index('ix_activity_entity', 'entity_type', 'entity_id'),
        db.Index('ix_activity_created', 'created_at'),
    )