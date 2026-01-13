"""
Admin Panel Permission System Models

Bu modeller CRM tarafındaki tenant permission sisteminden tamamen bağımsızdır.
Admin panel kullanıcılarının (AdminUser) platform seviyesindeki izinlerini yönetir.
"""
from datetime import datetime
import uuid
from models.base import db


# Junction table for AdminRole <-> AdminPermission many-to-many relationship
admin_role_permissions = db.Table(
    'admin_role_permissions',
    db.Column('id', db.String(36), primary_key=True, default=lambda: str(uuid.uuid4())),
    db.Column('role_id', db.String(36), db.ForeignKey('admin_roles.id', ondelete='CASCADE'), nullable=False),
    db.Column('permission_id', db.String(36), db.ForeignKey('admin_permissions.id', ondelete='CASCADE'), nullable=False),
    db.Column('created_at', db.DateTime, default=datetime.utcnow),
    db.UniqueConstraint('role_id', 'permission_id', name='uq_admin_role_permission')
)


# Junction table for AdminUser <-> AdminRole many-to-many relationship
admin_user_roles = db.Table(
    'admin_user_roles',
    db.Column('id', db.String(36), primary_key=True, default=lambda: str(uuid.uuid4())),
    db.Column('admin_user_id', db.String(36), db.ForeignKey('admin_users.id', ondelete='CASCADE'), nullable=False),
    db.Column('role_id', db.String(36), db.ForeignKey('admin_roles.id', ondelete='CASCADE'), nullable=False),
    db.Column('created_at', db.DateTime, default=datetime.utcnow),
    db.UniqueConstraint('admin_user_id', 'role_id', name='uq_admin_user_role')
)


class AdminRoleModel(db.Model):
    """
    Admin Panel Rolleri
    
    Bu roller sadece admin panel kullanıcıları (AdminUser) için geçerlidir.
    CRM tenant rolleriyle (Role modeli) karıştırılmamalıdır.
    
    Örnekler:
    - SuperAdmin: Tüm yetkiler
    - PlatformAdmin: Tenant ve kullanıcı yönetimi
    - Support: Sadece görüntüleme
    - Finance: Fatura ve ödeme yönetimi
    - Developer: Sistem logları ve debug
    """
    __tablename__ = 'admin_roles'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), unique=True, nullable=False, index=True)
    description = db.Column(db.String(500))
    is_system_role = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    permissions = db.relationship(
        'AdminPermissionModel',
        secondary=admin_role_permissions,
        lazy='dynamic',
        backref=db.backref('roles', lazy='dynamic')
    )
    
    users = db.relationship(
        'AdminUser',
        secondary=admin_user_roles,
        lazy='dynamic',
        backref=db.backref('admin_roles', lazy='dynamic')
    )
    
    def __repr__(self):
        return f'<AdminRole {self.name}>'
    
    def to_dict(self, include_permissions=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'is_system_role': self.is_system_role,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'user_count': self.users.count() if self.users else 0,
        }
        
        if include_permissions:
            data['permissions'] = [p.to_dict() for p in self.permissions.all()]
        
        return data
    
    def has_permission(self, permission_code: str) -> bool:
        """Check if role has a specific permission"""
        return self.permissions.filter_by(code=permission_code).first() is not None
    
    def get_permission_codes(self) -> list:
        """Get all permission codes for this role"""
        return [p.code for p in self.permissions.all()]


class AdminPermissionModel(db.Model):
    """
    Admin Panel İzinleri
    
    Platform seviyesinde izin tanımları.
    
    İzin kodu formatı: platform.<modul>.<aksiyon>
    
    Örnekler:
    - platform.tenants.read: Tenant bilgilerini görüntüleme
    - platform.tenants.manage: Tenant oluşturma/düzenleme/silme
    - platform.billing.manage: Fatura yönetimi
    - platform.impersonation.use: Kullanıcı taklit etme
    """
    __tablename__ = 'admin_permissions'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = db.Column(db.String(100), unique=True, nullable=False, index=True)
    label = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(500))
    category = db.Column(db.String(50))  # Grouping: tenants, billing, users, etc.
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f'<AdminPermission {self.code}>'
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'code': self.code,
            'label': self.label,
            'description': self.description,
            'category': self.category,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


# ============================================================================
# DEFAULT ADMIN PERMISSIONS
# ============================================================================

DEFAULT_ADMIN_PERMISSIONS = [
    # Tenant Management
    {'code': 'platform.tenants.read', 'label': 'Tenant Bilgilerini Görüntüle', 'category': 'tenants', 'description': 'Tenant listesini ve detaylarını görüntüleyebilir'},
    {'code': 'platform.tenants.manage', 'label': 'Tenant Yönetimi', 'category': 'tenants', 'description': 'Tenant oluşturabilir, düzenleyebilir, silebilir'},
    
    # User Management
    {'code': 'platform.users.read', 'label': 'Kullanıcıları Görüntüle', 'category': 'users', 'description': 'Admin panel kullanıcılarını görüntüleyebilir'},
    {'code': 'platform.users.manage', 'label': 'Kullanıcı Yönetimi', 'category': 'users', 'description': 'Admin panel kullanıcılarını yönetebilir'},
    
    # Role Management
    {'code': 'platform.roles.read', 'label': 'Rolleri Görüntüle', 'category': 'roles', 'description': 'Admin panel rollerini görüntüleyebilir'},
    {'code': 'platform.roles.manage', 'label': 'Rol Yönetimi', 'category': 'roles', 'description': 'Admin panel rollerini yönetebilir'},
    
    # Billing & Finance
    {'code': 'platform.billing.read', 'label': 'Faturaları Görüntüle', 'category': 'billing', 'description': 'Faturaları ve ödemeleri görüntüleyebilir'},
    {'code': 'platform.billing.manage', 'label': 'Fatura Yönetimi', 'category': 'billing', 'description': 'Fatura oluşturabilir, düzenleyebilir'},
    
    # Settings
    {'code': 'platform.settings.read', 'label': 'Ayarları Görüntüle', 'category': 'settings', 'description': 'Platform ayarlarını görüntüleyebilir'},
    {'code': 'platform.settings.manage', 'label': 'Ayar Yönetimi', 'category': 'settings', 'description': 'Platform ayarlarını değiştirebilir'},
    
    # Integrations
    {'code': 'platform.integrations.read', 'label': 'Entegrasyonları Görüntüle', 'category': 'integrations', 'description': 'Entegrasyon ayarlarını görüntüleyebilir'},
    {'code': 'platform.integrations.manage', 'label': 'Entegrasyon Yönetimi', 'category': 'integrations', 'description': 'Entegrasyonları yönetebilir'},
    
    # Logs & Audit
    {'code': 'platform.activity_logs.read', 'label': 'Aktivite Loglarını Görüntüle', 'category': 'logs', 'description': 'Aktivite loglarını görüntüleyebilir'},
    {'code': 'platform.audit.read', 'label': 'Denetim Kayıtlarını Görüntüle', 'category': 'logs', 'description': 'Denetim kayıtlarını görüntüleyebilir'},
    
    # System
    {'code': 'platform.system.read', 'label': 'Sistem Bilgilerini Görüntüle', 'category': 'system', 'description': 'Sistem durumunu ve logları görüntüleyebilir'},
    {'code': 'platform.system.manage', 'label': 'Sistem Yönetimi', 'category': 'system', 'description': 'Sistem ayarlarını ve bakım işlemlerini yönetebilir'},
    
    # Special Permissions
    {'code': 'platform.impersonation.use', 'label': 'Kullanıcı Taklit Etme', 'category': 'special', 'description': 'Tenant kullanıcılarını taklit edebilir (impersonation)'},
    {'code': 'platform.debug.use', 'label': 'Debug Araçları', 'category': 'special', 'description': 'Debug araçlarını kullanabilir'},
    
    # Module-specific
    {'code': 'platform.sms.manage', 'label': 'SMS Yönetimi', 'category': 'modules', 'description': 'SMS entegrasyonu ve ayarlarını yönetebilir'},
    {'code': 'platform.efatura.manage', 'label': 'E-Fatura Yönetimi', 'category': 'modules', 'description': 'E-Fatura entegrasyonu ve ayarlarını yönetebilir'},
    {'code': 'platform.ecommerce.manage', 'label': 'E-Ticaret Yönetimi', 'category': 'modules', 'description': 'E-ticaret modülünü yönetebilir'},
]


# ============================================================================
# DEFAULT ADMIN ROLES WITH PERMISSIONS
# ============================================================================

DEFAULT_ADMIN_ROLES = [
    {
        'name': 'SuperAdmin',
        'description': 'Tam yetkili sistem yöneticisi. Tüm izinlere sahiptir.',
        'is_system_role': True,
        'permissions': '*',  # All permissions
    },
    {
        'name': 'PlatformAdmin',
        'description': 'Platform yöneticisi. Tenant ve kullanıcı yönetimi yapabilir.',
        'is_system_role': True,
        'permissions': [
            'platform.tenants.read',
            'platform.tenants.manage',
            'platform.users.read',
            'platform.users.manage',
            'platform.roles.read',
            'platform.billing.read',
            'platform.billing.manage',
            'platform.activity_logs.read',
            'platform.audit.read',
            'platform.impersonation.use',
        ],
    },
    {
        'name': 'Support',
        'description': 'Destek ekibi. Sadece görüntüleme yetkisine sahiptir.',
        'is_system_role': True,
        'permissions': [
            'platform.tenants.read',
            'platform.users.read',
            'platform.roles.read',
            'platform.billing.read',
            'platform.activity_logs.read',
        ],
    },
    {
        'name': 'Finance',
        'description': 'Finans ekibi. Fatura ve ödeme yönetimi yapabilir.',
        'is_system_role': True,
        'permissions': [
            'platform.tenants.read',
            'platform.billing.read',
            'platform.billing.manage',
            'platform.activity_logs.read',
        ],
    },
    {
        'name': 'Developer',
        'description': 'Geliştirici. Sistem logları ve debug araçlarına erişebilir.',
        'is_system_role': True,
        'permissions': [
            'platform.system.read',
            'platform.activity_logs.read',
            'platform.audit.read',
            'platform.debug.use',
            'platform.integrations.read',
        ],
    },
]
