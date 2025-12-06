"""
Permission Middleware - Otomatik İzin Kontrolü

Bu middleware, tüm istekleri permissions_map.py konfigürasyonuna göre
otomatik olarak kontrol eder. Decorator kullanmaya gerek kalmaz.

Kullanım:
    from middleware.permission_middleware import init_permission_middleware
    init_permission_middleware(app)
"""

import logging
from functools import wraps
from flask import request, g
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request, get_jwt

from config.permissions_map import get_permission_for_endpoint, ENDPOINT_PERMISSIONS

logger = logging.getLogger(__name__)


def init_permission_middleware(app):
    """
    Flask app'e permission middleware'i ekler.
    Bu, before_request hook olarak çalışır.
    """
    
    @app.before_request
    def check_permissions():
        """Her request öncesi permission kontrolü yapar."""
        
        # Preflight CORS request'leri atla
        if request.method == 'OPTIONS':
            return None
        
        # Static dosyalar atla
        if request.path.startswith('/static'):
            return None
        
        # API olmayan path'ler atla
        if not request.path.startswith('/api'):
            return None
        
        # Bu endpoint için gerekli permission'ı bul
        required_permission = get_permission_for_endpoint(
            request.method,
            request.path
        )
        
        # Public endpoint - auth gerekmez
        if required_permission == 'public':
            return None
        
        # Auth gerektiren endpoint - JWT kontrolü
        try:
            verify_jwt_in_request()
        except Exception as e:
            # JWT yoksa veya geçersizse, route handler'a bırak
            # (zaten @jwt_required decorator var)
            return None
        
        # Permission None ise sadece JWT yeterli
        if required_permission is None:
            return None
        
        # Permission kontrolü
        jwt_data = get_jwt()
        current_user = get_jwt_identity()
        
        # Effective role'ü al (debug mode için veya DB'den)
        effective_role = jwt_data.get('effective_role') or jwt_data.get('role')
        
        # JWT'de role yoksa DB'den al
        if not effective_role:
            try:
                from models.user import User
                user = User.query.get(current_user)
                if user:
                    effective_role = user.role
            except Exception as e:
                logger.error(f"Could not get user role from DB: {e}")
        
        # ADMIN BYPASS: tenant_admin ve admin rolleri tüm izinlere sahip
        # Bu roller tam yetkili yönetici rolleridir
        ADMIN_ROLES = {'tenant_admin', 'admin'}
        
        # Admin Panel Endpoint'leri için özel kontrol
        if request.path.startswith('/api/admin/') and not request.path.startswith('/api/admin/debug/'):
            # Admin panel endpoint'leri sadece super admin (platform admin) erişebilir
            jwt_type = jwt_data.get('type')
            user_email = None
            
            # Super admin kontrolü
            if jwt_type == 'admin':
                # Admin panel JWT'si - izin ver
                logger.debug(f"Admin panel access granted: user={current_user}, type=admin")
                return None
            
            # Email kontrolü (admin@x-ear.com)
            try:
                from models.user import User
                user = User.query.get(current_user)
                if user and user.email == 'admin@x-ear.com':
                    logger.debug(f"Super admin access granted: user={current_user}")
                    return None
            except Exception:
                pass
            
            # Admin değilse reddet
            logger.warning(
                f"Admin panel access denied: user={current_user}, "
                f"path={request.path}, required=super_admin"
            )
            from flask import jsonify
            return jsonify({
                'error': 'Bu sayfaya erişim yetkiniz yok. Sadece platform yöneticileri erişebilir.',
                'required': 'super_admin',
                'path': request.path
            }), 403
        
        # CRM endpoint'leri için normal admin bypass
        if effective_role in ADMIN_ROLES:
            logger.debug(
                f"Admin bypass: user={current_user}, role={effective_role}, "
                f"permission={required_permission}"
            )
            return None
        
        # Role permissions'ı al
        role_permissions = jwt_data.get('role_permissions', [])
        
        # Permission var mı kontrol et
        if required_permission not in role_permissions:
            # Database'den de kontrol et (JWT claim'i eski olabilir)
            if not _check_permission_from_db(effective_role, required_permission):
                logger.warning(
                    f"Permission denied [MIDDLEWARE]: user={current_user}, "
                    f"role={effective_role}, path={request.path}, "
                    f"method={request.method}, required={required_permission}"
                )
                from flask import jsonify
                return jsonify({
                    'error': f'Bu işlem için yetkiniz yok: {required_permission}',
                    'required_permission': required_permission,
                    'your_role': effective_role,
                    'path': request.path
                }), 403
        
        # Permission OK
        logger.debug(
            f"Permission granted: user={current_user}, "
            f"permission={required_permission}"
        )
        return None


def _check_permission_from_db(role_name: str, permission_name: str) -> bool:
    """Database'den rol-permission ilişkisini kontrol eder."""
    try:
        from models.role import Role
        from models.permission import Permission
        
        role = Role.query.filter_by(name=role_name).first()
        if not role:
            return False
        
        # Permission model uses 'name' field, not 'key'
        permission = Permission.query.filter_by(name=permission_name).first()
        if not permission:
            return False
        
        return permission in role.permissions
    except Exception as e:
        logger.error(f"Permission DB check error: {e}")
        return False


def register_permission_blueprint(app):
    """
    Permission analiz endpoint'lerini ekler.
    /api/admin/permissions/* endpoint'leri
    """
    from flask import Blueprint, jsonify
    from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
    
    perm_bp = Blueprint('permission_admin', __name__)
    
    def _get_user_role():
        """JWT'den veya DB'den kullanıcı rolünü al."""
        jwt = get_jwt()
        role = jwt.get('effective_role') or jwt.get('role')
        
        # JWT'de role yoksa DB'den al
        if not role:
            try:
                from models.user import User
                user_id = get_jwt_identity()
                user = User.query.get(user_id)
                if user:
                    role = user.role
            except Exception as e:
                logger.error(f"Could not get user role from DB: {e}")
        
        return role
    
    @perm_bp.route('/api/admin/permissions/map', methods=['GET'])
    @jwt_required()
    def get_permission_map():
        """Tüm endpoint-permission mapping'ini döndürür."""
        role = _get_user_role()
        
        # Sadece tenant_admin ve admin görebilir
        if role not in ['tenant_admin', 'admin']:
            return jsonify({'error': 'Yetkisiz'}), 403
        
        result = []
        for (method, path), perm in ENDPOINT_PERMISSIONS.items():
            result.append({
                'method': method,
                'path': path,
                'permission': perm or 'jwt_required_only'
            })
        
        return jsonify({
            'total_endpoints': len(result),
            'endpoints': sorted(result, key=lambda x: x['path'])
        })
    
    @perm_bp.route('/api/admin/permissions/coverage', methods=['GET'])
    @jwt_required()
    def get_permission_coverage():
        """Permission coverage raporunu döndürür."""
        role = _get_user_role()
        
        if role not in ['tenant_admin', 'admin']:
            return jsonify({'error': 'Yetkisiz'}), 403
        
        total = len(ENDPOINT_PERMISSIONS)
        with_permission = sum(1 for p in ENDPOINT_PERMISSIONS.values() if p and p != 'public')
        public = sum(1 for p in ENDPOINT_PERMISSIONS.values() if p == 'public')
        jwt_only = sum(1 for p in ENDPOINT_PERMISSIONS.values() if p is None)
        
        # Unique permissions
        unique_perms = set(p for p in ENDPOINT_PERMISSIONS.values() if p and p != 'public')
        
        return jsonify({
            'total_endpoints': total,
            'with_permission_check': with_permission,
            'public_endpoints': public,
            'jwt_required_only': jwt_only,
            'coverage_percentage': round((with_permission / total) * 100, 1) if total > 0 else 0,
            'unique_permissions': sorted(list(unique_perms)),
            'unique_permission_count': len(unique_perms)
        })
    
    @perm_bp.route('/api/admin/permissions/check/<path:endpoint_path>', methods=['GET'])
    @jwt_required()
    def check_endpoint_permission(endpoint_path):
        """Belirli bir endpoint için gerekli permission'ı döndürür."""
        method = request.args.get('method', 'GET').upper()
        path = f'/api/{endpoint_path}'
        
        permission = get_permission_for_endpoint(method, path)
        
        return jsonify({
            'method': method,
            'path': path,
            'required_permission': permission or 'jwt_required_only' if permission is not None else 'not_mapped'
        })
    
    app.register_blueprint(perm_bp)


def validate_permission_map():
    """
    Permission map'in tutarlılığını kontrol eder.
    Server başlatıldığında çalıştırılmalı.
    """
    errors = []
    warnings = []
    
    # Tüm permission key'lerin database'de var olup olmadığını kontrol et
    try:
        from models.permission import Permission
        
        # Permission model uses 'name' field
        db_permissions = {p.name for p in Permission.query.all()}
        map_permissions = {p for p in ENDPOINT_PERMISSIONS.values() if p and p != 'public'}
        
        # Map'te olup DB'de olmayan
        missing_in_db = map_permissions - db_permissions
        if missing_in_db:
            warnings.append(f"Permissions in map but not in DB (will be created): {missing_in_db}")
        
        # DB'de olup map'te olmayan (uyarı)
        unused_in_db = db_permissions - map_permissions
        if unused_in_db:
            warnings.append(f"Permissions in DB but not used in map: {unused_in_db}")
        
    except Exception as e:
        warnings.append(f"Could not validate against DB: {e}")
    
    # Sonuçları logla
    if errors:
        logger.error(f"Permission map validation ERRORS: {errors}")
    if warnings:
        logger.warning(f"Permission map validation WARNINGS: {warnings}")
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings
    }
