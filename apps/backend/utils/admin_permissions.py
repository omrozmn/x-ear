"""
Admin Panel Permission Decorator & Utilities

Bu modül admin panel endpoint'leri için izin kontrolü sağlar.
CRM permission sisteminden tamamen bağımsızdır.
"""
import logging
from functools import wraps
from flask import request, jsonify, g
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request, get_jwt

logger = logging.getLogger(__name__)


def require_admin_permission(*required_permissions):
    """
    Admin panel endpoint'leri için izin kontrolü decorator'ı.
    
    Kullanım:
        @require_admin_permission("platform.tenants.manage")
        def create_tenant():
            ...
        
        @require_admin_permission("platform.users.read", "platform.users.manage")
        def manage_users():
            ...
    
    Davranış:
        - JWT'den admin_user_id alır
        - AdminUser'ın rollerini bulur
        - Roller üzerinden tüm permissions'ı toplar
        - İstenen permission listede yoksa 403 döner
        - SuperAdmin ise tüm izinleri otomatik geçer
        - Impersonation durumunda real_user_id logging yapılır
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # JWT kontrolü
                verify_jwt_in_request()
                jwt_data = get_jwt()
                user_id = get_jwt_identity()
                
                # Admin JWT mi kontrol et - token type 'admin' VEYA user AdminUser tablosunda olmalı
                token_type = jwt_data.get('type') or jwt_data.get('token_type')
                
                # AdminUser'ı yükle (hem admin hem normal tokenlar için)
                from models.admin_user import AdminUser
                admin_user = AdminUser.query.get(user_id)
                
                # AdminUser kontrolü - user mutlaka AdminUser tablosunda olmalı
                if not admin_user:
                    # Normal user (non-admin) token ile admin endpoint'e erişmeye çalışıyor
                    logger.warning(f"Non-admin user attempted admin endpoint access: user_id={user_id}, type={token_type}")
                    return jsonify({
                        'error': 'Bu endpoint sadece admin panel kullanıcıları için erişilebilir',
                        'code': 'ADMIN_USER_REQUIRED'
                    }), 403
                
                if not admin_user.is_active:
                    logger.warning(f"Inactive admin user attempted access: {user_id}")
                    return jsonify({
                        'error': 'Hesabınız devre dışı bırakılmış',
                        'code': 'ADMIN_USER_INACTIVE'
                    }), 403
                
                # SuperAdmin bypass - tüm izinlere sahip
                if admin_user.is_super_admin():
                    logger.debug(f"SuperAdmin bypass: user={admin_user.email}")
                    g.admin_user = admin_user
                    g.admin_permissions = {'*'}  # All permissions
                    return f(*args, **kwargs)
                
                # Kullanıcının tüm izinlerini topla
                user_permissions = admin_user.get_all_permissions()
                
                # İzin kontrolü - herhangi biri yeterli (OR logic)
                has_permission = False
                for perm in required_permissions:
                    if perm in user_permissions:
                        has_permission = True
                        break
                
                if not has_permission:
                    logger.warning(
                        f"Admin permission denied: user={admin_user.email}, "
                        f"required={required_permissions}, has={user_permissions}"
                    )
                    return jsonify({
                        'error': 'Bu işlem için yetkiniz yok',
                        'code': 'PERMISSION_DENIED',
                        'required_permissions': list(required_permissions),
                        'your_permissions': list(user_permissions)
                    }), 403
                
                # İzin OK - context'e ekle
                g.admin_user = admin_user
                g.admin_permissions = user_permissions
                
                # Impersonation logging
                if jwt_data.get('is_impersonating'):
                    real_user_id = jwt_data.get('real_admin_id')
                    logger.info(
                        f"Admin impersonation action: real_admin={real_user_id}, "
                        f"acting_as={admin_user.email}, permission={required_permissions}"
                    )
                
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"Admin permission check error: {e}")
                return jsonify({
                    'error': 'Yetkilendirme hatası',
                    'code': 'AUTH_ERROR'
                }), 401
        
        return decorated_function
    return decorator


def require_super_admin(f):
    """
    Sadece SuperAdmin'e izin veren decorator.
    
    Kullanım:
        @require_super_admin
        def delete_system_role():
            ...
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            verify_jwt_in_request()
            jwt_data = get_jwt()
            admin_user_id = get_jwt_identity()
            
            # Admin JWT mi kontrol et (claim name is 'type' from login)
            token_type = jwt_data.get('type') or jwt_data.get('token_type')
            if token_type != 'admin':
                return jsonify({
                    'error': 'Bu endpoint sadece admin panel kullanıcıları için erişilebilir',
                    'code': 'ADMIN_TOKEN_REQUIRED'
                }), 403
            
            from models.admin_user import AdminUser
            admin_user = AdminUser.query.get(admin_user_id)
            
            if not admin_user or not admin_user.is_super_admin():
                logger.warning(f"Non-SuperAdmin attempted SuperAdmin action: {admin_user_id}")
                return jsonify({
                    'error': 'Bu işlem sadece SuperAdmin tarafından yapılabilir',
                    'code': 'SUPER_ADMIN_REQUIRED'
                }), 403
            
            g.admin_user = admin_user
            g.admin_permissions = {'*'}
            
            return f(*args, **kwargs)
            
        except Exception as e:
            logger.error(f"SuperAdmin check error: {e}")
            return jsonify({
                'error': 'Yetkilendirme hatası',
                'code': 'AUTH_ERROR'
            }), 401
    
    return decorated_function


def get_current_admin_user():
    """Request context'inden mevcut admin kullanıcısını döndürür"""
    return getattr(g, 'admin_user', None)


def get_current_admin_permissions():
    """Request context'inden mevcut admin izinlerini döndürür"""
    return getattr(g, 'admin_permissions', set())


def admin_has_permission(permission_code: str) -> bool:
    """Mevcut admin kullanıcısının belirli bir izne sahip olup olmadığını kontrol eder"""
    permissions = get_current_admin_permissions()
    
    if '*' in permissions:  # SuperAdmin
        return True
    
    return permission_code in permissions


# ============================================================================
# PERMISSION CONSTANTS
# ============================================================================

class AdminPermissions:
    """Admin panel izin sabitleri"""
    
    # Tenant
    TENANTS_READ = 'platform.tenants.read'
    TENANTS_MANAGE = 'platform.tenants.manage'
    
    # Dashboard
    DASHBOARD_VIEW = 'platform.dashboard.view'
    
    # Users
    USERS_READ = 'platform.users.read'
    USERS_MANAGE = 'platform.users.manage'
    
    # Roles
    ROLES_READ = 'platform.roles.read'
    ROLES_MANAGE = 'platform.roles.manage'
    
    # Billing
    BILLING_READ = 'platform.billing.read'
    BILLING_MANAGE = 'platform.billing.manage'
    
    # Settings
    SETTINGS_READ = 'platform.settings.read'
    SETTINGS_MANAGE = 'platform.settings.manage'
    
    # Integrations
    INTEGRATIONS_READ = 'platform.integrations.read'
    INTEGRATIONS_MANAGE = 'platform.integrations.manage'
    
    # Logs
    ACTIVITY_LOGS_READ = 'platform.activity_logs.read'
    AUDIT_READ = 'platform.audit.read'
    
    # System
    SYSTEM_READ = 'platform.system.read'
    SYSTEM_MANAGE = 'platform.system.manage'
    
    # Special
    IMPERSONATION_USE = 'platform.impersonation.use'
    DEBUG_USE = 'platform.debug.use'
    
    # Modules
    SMS_MANAGE = 'platform.sms.manage'
    EFATURA_MANAGE = 'platform.efatura.manage'
    ECOMMERCE_MANAGE = 'platform.ecommerce.manage'
    
    # New Modules
    API_KEYS_READ = 'platform.apikeys.read'
    API_KEYS_MANAGE = 'platform.apikeys.manage'
    
    MARKETPLACES_READ = 'platform.marketplaces.read'
    MARKETPLACES_MANAGE = 'platform.marketplaces.manage'
    
    SCAN_QUEUE_READ = 'platform.scan_queue.read'
    SCAN_QUEUE_MANAGE = 'platform.scan_queue.manage'
    
    PRODUCTION_READ = 'platform.production.read'
    PRODUCTION_MANAGE = 'platform.production.manage'
    
    BIRFATURA_READ = 'platform.birfatura.read'
    BIRFATURA_MANAGE = 'platform.birfatura.manage'
    
    # Additional Modules
    ANALYTICS_READ = 'platform.analytics.read'
    
    PATIENTS_READ = 'platform.patients.read'
    PATIENTS_MANAGE = 'platform.patients.manage'
    
    APPOINTMENTS_READ = 'platform.appointments.read'
    APPOINTMENTS_MANAGE = 'platform.appointments.manage'
    
    INVENTORY_READ = 'platform.inventory.read'
    INVENTORY_MANAGE = 'platform.inventory.manage'
    
    ADDONS_READ = 'platform.addons.read'
    ADDONS_MANAGE = 'platform.addons.manage'
    
    TICKETS_READ = 'platform.tickets.read'
    TICKETS_MANAGE = 'platform.tickets.manage'
    
    NOTIFICATIONS_READ = 'platform.notifications.read'
    NOTIFICATIONS_MANAGE = 'platform.notifications.manage'
    
    PLANS_READ = 'platform.plans.read'
    PLANS_MANAGE = 'platform.plans.manage'
    
    INVOICES_READ = 'platform.invoices.read'
    INVOICES_MANAGE = 'platform.invoices.manage'

    # Suppliers
    SUPPLIERS_READ = 'platform.suppliers.read'
    SUPPLIERS_MANAGE = 'platform.suppliers.manage'

    # Campaigns
    CAMPAIGNS_READ = 'platform.campaigns.read'
    CAMPAIGNS_MANAGE = 'platform.campaigns.manage'

    # SMS Packages & Headers
    SMS_PACKAGES_READ = 'platform.sms_packages.read'
    SMS_PACKAGES_MANAGE = 'platform.sms_packages.manage'
    SMS_HEADERS_READ = 'platform.sms_headers.read'
    SMS_HEADERS_MANAGE = 'platform.sms_headers.manage'

    # Payments
    PAYMENTS_READ = 'platform.payments.read'
    PAYMENTS_MANAGE = 'platform.payments.manage'

