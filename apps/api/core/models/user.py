from sqlalchemy import Table, Column, Boolean, Date, DateTime, ForeignKey, Integer, JSON, String, Text, Time, Index
from sqlalchemy.orm import relationship, backref
# User and Activity Models
from core.models.base import Base
from .base import db, BaseModel, gen_id, JSONMixin
from .mixins import TenantScopedMixin
from werkzeug.security import generate_password_hash, check_password_hash
import json

# Association table for User-Branch many-to-many relationship
user_branches = Table('user_branches', Base.metadata,
    Column('user_id', String(50), ForeignKey('users.id'), primary_key=True),
    Column('branch_id', String(50), ForeignKey('branches.id'), primary_key=True)
)

class User(BaseModel, TenantScopedMixin):
    __tablename__ = 'users'

    # Primary key with auto-generated default
    id = Column(String(50), primary_key=True, default=lambda: gen_id("usr"))
    
    # Authentication
    username = Column(String(80), unique=True, nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    phone = Column(String(20), unique=True, nullable=True)
    phone = Column(String(20), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    
    # User details
    first_name = Column(String(100))
    last_name = Column(String(100))
    role = Column(String(20), default='user')
    is_active = Column(Boolean, default=True)
    is_phone_verified = Column(Boolean, default=False)
    
    # Permission versioning - incremented when role permissions change
    # Token contains this version, if mismatch -> force re-login
    permissions_version = Column(Integer, default=1, nullable=False)
    
    # Relationships
    branches = relationship('Branch', secondary=user_branches, lazy='subquery',
        backref=backref('users', lazy=True))
    
    # Future fields for enhancement
    last_login = Column(DateTime)
    password_reset_token = Column(String(100))
    password_reset_expires = Column(DateTime)
    affiliate_code = Column(String(50), nullable=True, index=True)

    def set_password(self, password):
        """Hash and set password using passlib bcrypt"""
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.password_hash = pwd_context.hash(password)

    def check_password(self, password):
        """Check password against hash using passlib"""
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        try:
            return pwd_context.verify(password, self.password_hash)
        except Exception:
            return False

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}" if self.first_name and self.last_name else self.username

    def to_dict(self):
        base_dict = self.to_dict_base()
        user_dict = {
            'id': self.id,
            'tenantId': self.tenant_id,
            'username': self.username,
            'email': self.email,
            'firstName': self.first_name,
            'lastName': self.last_name,
            'fullName': self.full_name,
            'role': self.role,
            'phone': self.phone,
            'isPhoneVerified': self.is_phone_verified,
            'isActive': self.is_active,
            'branches': [branch.to_dict() for branch in self.branches],
            'lastLogin': self.last_login.isoformat() if self.last_login else None
        }
        user_dict.update(base_dict)
        return user_dict

class ActivityLog(BaseModel, TenantScopedMixin, JSONMixin):
    """
    Activity Log model for tracking user actions across the platform.
    
    Supports two-level visibility:
    - Platform Admin: See all tenant logs
    - Tenant Admin: See only their tenant's logs
    
    Log retention: 180 days (configurable via ACTIVITY_LOG_RETENTION_DAYS)
    """
    __tablename__ = 'activity_logs'

    # Primary key with auto-generated default
    id = Column(String(50), primary_key=True, default=lambda: gen_id("log"))
    
    # tenant_id is now inherited from TenantScopedMixin
    branch_id = Column(String(50), ForeignKey('branches.id'), nullable=True)
    
    # User tracking
    user_id = Column(String(50), nullable=True)  # Nullable for system actions
    real_user_id = Column(String(50), nullable=True)  # For impersonation tracking
    role = Column(String(50), nullable=True)  # User's role at action time
    
    # Action details
    action = Column(String(100), nullable=False)  # e.g., "patient.created", "invoice.sent"
    message = Column(String(500), nullable=True)  # Human-readable action description
    entity_type = Column(String(50), nullable=True)  # Legacy field, now derived from action
    entity_id = Column(String(50), nullable=True)
    
    # Structured data (JSON)
    data = Column(Text, nullable=True)  # JSON - target IDs, file names, etc.
    
    # Request metadata
    ip_address = Column(String(45), nullable=True)  # IPv6 support
    user_agent = Column(Text, nullable=True)
    
    # Legacy field for backward compatibility
    details = Column(Text, nullable=True)  # Deprecated, use 'data' instead
    
    # Critical action flag for filtering
    is_critical = Column(Boolean, default=False, index=True)
    
    # Relationships for joined queries
    tenant = relationship('Tenant', backref=backref('activity_logs', lazy='dynamic'))
    branch = relationship('Branch', backref=backref('activity_logs', lazy='dynamic'))

    @property
    def data_json(self):
        """Parse data field as JSON"""
        return self.json_load(self.data)
    
    @data_json.setter
    def data_json(self, value):
        """Serialize value to JSON for data field"""
        self.data = self.json_dump(value)

    @property
    def details_json(self):
        """Legacy property for backward compatibility"""
        return self.json_load(self.details)
    
    @details_json.setter
    def details_json(self, value):
        """Legacy setter for backward compatibility"""
        self.details = self.json_dump(value)

    def to_dict(self):
        """Convert to dictionary for API response"""
        base_dict = self.to_dict_base()
        log_dict = {
            'id': self.id,
            'tenantId': self.tenant_id,
            'branchId': self.branch_id,
            'userId': self.user_id,
            'realUserId': self.real_user_id,
            'role': self.role,
            'action': self.action,
            'message': self.message,
            'entityType': self.entity_type,
            'entityId': self.entity_id,
            'data': self.data_json,
            'ipAddress': self.ip_address,
            'userAgent': self.user_agent,
            'isCritical': self.is_critical,
            # Legacy field
            'details': self.details_json
        }
        log_dict.update(base_dict)
        return log_dict
    
    def to_dict_with_user(self):
        """Convert to dictionary with user information for display"""
        result = self.to_dict()
        
        # Get user name if available
        if self.user_id:
            try:
                user = User.query.get(self.user_id)
                if user:
                    result['userName'] = f"{user.first_name} {user.last_name}" if user.first_name else user.username
                    result['userEmail'] = user.email
            except Exception:
                pass
        
        # Get tenant name if available
        if self.tenant_id:
            try:
                from .tenant import Tenant
                tenant = Tenant.query.get(self.tenant_id)
                if tenant:
                    result['tenantName'] = tenant.name
            except Exception:
                pass
        
        # Get branch name if available
        if self.branch_id:
            try:
                from .branch import Branch
                branch = Branch.query.get(self.branch_id)
                if branch:
                    result['branchName'] = branch.name
            except Exception:
                pass
        
        # Get patient name if available (for patient-related logs)
        if self.entity_type == 'patient' and self.entity_id:
            try:
                from .patient import Patient
                patient = Patient.query.get(self.entity_id)
                if patient:
                    result['patientName'] = f"{patient.first_name} {patient.last_name}"
            except Exception:
                pass
        
        return result

    # Composite indexes for performance
    __table_args__ = (
        Index('ix_activity_user', 'user_id'),
        Index('ix_activity_entity', 'entity_type', 'entity_id'),
        Index('ix_activity_created', 'created_at'),
        Index('ix_activity_tenant_created', 'tenant_id', 'created_at'),  # Main query index
        Index('ix_activity_action', 'action'),
        Index('ix_activity_tenant_action', 'tenant_id', 'action'),
    )