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
    """
    Activity Log model for tracking user actions across the platform.
    
    Supports two-level visibility:
    - Platform Admin: See all tenant logs
    - Tenant Admin: See only their tenant's logs
    
    Log retention: 180 days (configurable via ACTIVITY_LOG_RETENTION_DAYS)
    """
    __tablename__ = 'activity_logs'

    # Primary key with auto-generated default
    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id("log"))
    
    # Multi-tenant support
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=True, index=True)
    branch_id = db.Column(db.String(50), db.ForeignKey('branches.id'), nullable=True)
    
    # User tracking
    user_id = db.Column(db.String(50), nullable=True)  # Nullable for system actions
    real_user_id = db.Column(db.String(50), nullable=True)  # For impersonation tracking
    role = db.Column(db.String(50), nullable=True)  # User's role at action time
    
    # Action details
    action = db.Column(db.String(100), nullable=False)  # e.g., "patient.created", "invoice.sent"
    message = db.Column(db.String(500), nullable=True)  # Human-readable action description
    entity_type = db.Column(db.String(50), nullable=True)  # Legacy field, now derived from action
    entity_id = db.Column(db.String(50), nullable=True)
    
    # Structured data (JSON)
    data = db.Column(db.Text, nullable=True)  # JSON - target IDs, file names, etc.
    
    # Request metadata
    ip_address = db.Column(db.String(45), nullable=True)  # IPv6 support
    user_agent = db.Column(db.Text, nullable=True)
    
    # Legacy field for backward compatibility
    details = db.Column(db.Text, nullable=True)  # Deprecated, use 'data' instead
    
    # Critical action flag for filtering
    is_critical = db.Column(db.Boolean, default=False, index=True)
    
    # Relationships for joined queries
    tenant = db.relationship('Tenant', backref=db.backref('activity_logs', lazy='dynamic'))
    branch = db.relationship('Branch', backref=db.backref('activity_logs', lazy='dynamic'))

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
        db.Index('ix_activity_user', 'user_id'),
        db.Index('ix_activity_entity', 'entity_type', 'entity_id'),
        db.Index('ix_activity_created', 'created_at'),
        db.Index('ix_activity_tenant_created', 'tenant_id', 'created_at'),  # Main query index
        db.Index('ix_activity_action', 'action'),
        db.Index('ix_activity_tenant_action', 'tenant_id', 'action'),
    )